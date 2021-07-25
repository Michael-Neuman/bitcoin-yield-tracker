import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const oppDirectory = path.join(process.cwd(), 'opportunities')

export function getOpportunities() {
    // Get file names under /opportunities
    const fileNames = fs.readdirSync(oppDirectory)
    return fileNames.map(fileName => {
        // Remove ".md" from file name to get id
        const id = fileName.replace(/\.md$/, '')

        // Get and return the opportunity
        return getOpportunity(id)
    })
}

export function getOpportunity(opportunityId) {
    const fileName = opportunityId + '.md'

    // Read markdown file as string
    const fullPath = path.join(oppDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)

    // Combine the data with the id
    return {
        id:opportunityId,
        ...matterResult.data
    }
}
