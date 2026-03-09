export interface IBaseResult<T> {
    isSuccessful: boolean,
    result: T
    results: IPagedResults<T>,
    errorMessage: string
}

export interface IPagedResults<T>{
    page: number,
    pageSize: number,
    totalPages: number,
    totalItems: number,
    lsv: string,
    pagedItems: T[]
}