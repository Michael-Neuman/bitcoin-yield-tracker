import { ethers } from "ethers";
import ibBTCabi from '/abis/ibBTCABI.json';
import rBTCabi from '/abis/rBTCABI.json';
import bProabi from '/abis/bProABI.json';

export default async function handler(req, res) {
    const { slug } = req.query
    switch(slug[0]) {
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
            res.status(404).send()
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