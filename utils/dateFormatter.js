export const formatDateForDB = (dateTimeString) => {
    if (!dateTimeString) return null;
    
    const [datePart] = dateTimeString.split(" - ");
    const [day, month, year] = datePart.split("-");
    return `${year}-${month}-${day}`;
};

export const formatDateForDisplay = (date) => {
    if (!date) return null;
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}-${month}-${year}`;
};