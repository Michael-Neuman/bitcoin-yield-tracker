import { ethers } from "ethers";
import { getOpportunity } from '../../../lib/opportunities'
import ibBTCabi from '/abis/ibBTCABI.json';
import rBTCabi from '/abis/rBTCABI.json';
import bProabi from '/abis/bProABI.json';

export default async function handler(req, res) {
    const { '...slug': slug } = req.query
    // Pull in any configuration data available from opportunity definition file.
//TODO: come up with .md data format that accomodates multiple rate tiers
    switch(slug) {
        case 'ibbtc':
            const dayOldBlock = 86400 // [Seconds in a day]
            const weekOldBlock = dayOldBlock * 7
            const apyFromLastWeek = await fetchIbbtcApyFromTimestamp(weekOldBlock)
            res.status(200).json({ apyFromLastWeek: apyFromLastWeek })
            break
        case 'rbtc':
            const nextSupplyInterestRate = await fetchSovrynApy('0xa9DcDC63eaBb8a2b6f39D7fF9429d88340044a7A', rBTCabi)
            res.status(200).json({ nextSupplyInterestRate: nextSupplyInterestRate })
            break
        case 'bpro':
            const interestRate = await fetchSovrynApy('0x6E2fb26a60dA535732F8149b25018C9c0823a715', bProabi)
            res.status(200).json({ nextSupplyInterestRate: interestRate })
            break
        default:
            let opp = getOpportunity(slug)
            if (opp !== null) {
                let apy = await fetchHTMLApy(opp.html_source, opp.html_selector)
                if (typeof opp.html_regex !== 'undefined') {
                    // A regular expression was provided to clean up and format this data.
                    let regE = new RegExp(opp.html_regex)
                    let cleanApy = regE.exec(apy)
                    apy = cleanApy[0]
                }
                // Format data in a consistent manner
                res.status(200).json({apy: ethers.FixedNumber.from(apy.substring(0, (apy.length))).divUnsafe(ethers.FixedNumber.from(100)).round(6).toString()})
            } else {
                console.error(`Opportunity ${slug} not found in request query: %j`, req.query)
                res.status(404).send()
            }
            break
    }
}

async function fetchIbbtcApyFromTimestamp(timestamp) {
    try {
        const secondsPerYear = ethers.BigNumber.from(31536000)
        const provider = new ethers.providers.AlchemyProvider()
        const contractAddress = '0xc4e15973e6ff2a35cc804c2cf9d2a1b817a8b40f'
        const contract = new ethers.Contract(contractAddress, ibBTCabi, provider)
        const currentPPS = await contract.pricePerShare()
        const fixedCurrentPPS = ethers.FixedNumber.from(currentPPS);
        const currentBlock = await provider.getBlockNumber() - 50
        const targetBlock = currentBlock - Math.floor(timestamp / 15)
        const oldPPS = await contract.pricePerShare({ blockTag: targetBlock })
        const fixedOldPPS = ethers.FixedNumber.from(oldPPS);
        const ppsGrowth = fixedCurrentPPS.subUnsafe(fixedOldPPS).divUnsafe(fixedOldPPS)
        const growthPerSecond = ppsGrowth.mulUnsafe(ethers.FixedNumber.from(secondsPerYear.div(timestamp)))
        return growthPerSecond.round(6).toString()
    } catch (error) {
        console.error(`Error while getting ibBTC APY from block ${currentBlock - timestamp}: ${error}`)
        return null
    }
}
async function fetchSovrynApy(contractAddress, abi) {
    // This logic is based off of https://github.com/DistributedCollective/Sovryn-frontend > src/app/components/NextSupplyInterestRate/index.tsx
    try {
        const provider = new ethers.providers.JsonRpcProvider('https://public-node.rsk.co')
        const contract = new ethers.Contract(contractAddress, abi, provider)
        // TODO: "1" below represents the amount of token that will be lent.  When connecting a user's wallet, use their balance instead of this arbitrary number.
        const apy = await contract.nextSupplyInterestRate('1')
        const fixedAPY = ethers.FixedNumber.from(apy).divUnsafe(ethers.FixedNumber.from(ethers.BigNumber.from("10").pow(20)))
        return fixedAPY.round(6).toString()
    } catch (error) {
        console.error(`Error while getting ${contractAddress} APY: ${error}`)
        return null
    }
}

async function fetchHTMLApy(apiURL, selector) {
    try {
        let chrome = {};
        let puppeteer;

        if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
            // running on the Vercel platform.
            chrome = require('chrome-aws-lambda');
            puppeteer = require('puppeteer-core');
        } else {
            // running locally.
            puppeteer = require('puppeteer');
        }

        const browser = await puppeteer.launch({
            args: chrome.args,
            executablePath: await chrome.executablePath,
        })
        const page = await browser.newPage()
        // Set some additional headers to this request so it works for sites that are blocking headless requests per https://github.com/puppeteer/puppeteer/issues/665
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
        })
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36')
        await page.goto(apiURL)
        let apy = await page.evaluate((sel) => {
            let element = document.querySelector(sel)
            return element? element.innerHTML: null
        }, selector)
        await browser.close()
        return apy.toString()
    } catch (error) {
        console.error(`Error while getting APY: ${error}`)
        return null
    }
}