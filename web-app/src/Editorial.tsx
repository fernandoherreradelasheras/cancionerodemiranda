

export interface EditorialItem {
    id: string
    type: string
    targetIds: string[]
    reason?: string
    resp: string
    boundingBox:  { x: number, y: number, width: number, height: number } | null
    textFromAnnotations?: string
}

export interface Annotation {
    id: string
    targetIds: string[]
    text: string
}