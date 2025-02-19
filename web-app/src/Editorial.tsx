

export interface EditorialItem {
    id: string
    type: string
    reason?: string
    resp: string
    boundingBox:  { x: number, y: number, width: number, height: number } | null
    annotations: Set<Annotation>
    choice?: Choice
    correspIds?: string[]

}

export interface Option {
    type: string
    selector: string
}


export interface Choice {
    id: string
    options: Option[]
    selectedOptionIdx: number
}


export interface Annotation {
    id: string
    text: string
    targetIds: string[]
}