

function range(start: number, end: number) {
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }
  
  function pagination(currentPage: number, totalPages: number) {
    const leftSiblingIndex = Math.max(currentPage - 1, 1);
    const rightSiblingIndex = Math.min(currentPage + 1, totalPages);
  
    const shouldShowLeftEllipsis = leftSiblingIndex > 2;
    const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 2;
  
    const firstPageIndex = 1;
    const lastPageIndex = totalPages;
  
    if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      const leftItemCount = 3;
      const leftRange = range(1, leftItemCount + 2);
  
      return [...leftRange, '...', totalPages];
    }
  
    if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
      const rightItemCount = 3;
      const rightRange = range(totalPages - rightItemCount - 1, totalPages);
  
      return [firstPageIndex, '...', ...rightRange];
    }
  
    if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
  
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }
  
    return range(1, totalPages);
  }
  


function Pagination({currentPageNumber, totalPages, className, onPage} 
    : { 
        currentPageNumber: number,
        totalPages: number,
        className: string,
        onPage: (page: number) => void,

    }) {


    const onPageClick = (index: number) => {
        onPage(index)
    }


    const paginationElement = (label: any) => {
        if (label == "...") {
            return (<span className="page disabled">…</span>)
        } else if (label == currentPageNumber) {
            return (<span className="button page disabled">{label}</span>)
        } else {
            return (<span onClick={() => onPageClick(label)} className="button page">{label}</span>)
        }
    }


    return (

        <ul className={"pagination " + className}>

            {pagination(currentPageNumber, totalPages).map((label: any, index: number) =>
                <li key={index}>
                    {paginationElement(label)}
                </li>)}

        </ul>
    )
}

export default Pagination