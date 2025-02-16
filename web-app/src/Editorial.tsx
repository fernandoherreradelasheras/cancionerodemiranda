

export interface EditorialItem {
    id: string
    type: string
    targetIds: string[]
    reason: string | undefined
    resp: string
    boundingBox:  { x: number, y: number, width: number, height: number } | null
}