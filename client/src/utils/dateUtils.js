export const parseDateToDdMmYyyy = (dateStr) => {
    if (!dateStr) return 'Unknown Date';
    try {
        // Check if timestamp in milliseconds or a number
        if (!isNaN(dateStr) && typeof dateStr !== 'boolean') {
            const d = new Date(parseInt(dateStr));
            if (!isNaN(d.getTime())) {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}-${mm}-${yyyy}`;
            }
        }
        
        let normalizedDateStr = String(dateStr).trim();
        
        // Clean time parts and extract only the date portion (e.g. before space or comma)
        const dateOnly = normalizedDateStr.split(',')[0].split(' ')[0].trim();
        
        // Try parsing using standard Date constructor
        const d = new Date(normalizedDateStr);
        if (!isNaN(d.getTime())) {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        }
        
        // 1. Try dot separation (e.g., "04.07.2026")
        const dotParts = dateOnly.split('.');
        if (dotParts.length === 3) {
            let dd, mm, yyyy;
            if (dotParts[0].length === 4) {
                yyyy = parseInt(dotParts[0]);
                mm = parseInt(dotParts[1]);
                dd = parseInt(dotParts[2]);
            } else {
                dd = parseInt(dotParts[0]);
                mm = parseInt(dotParts[1]);
                yyyy = parseInt(dotParts[2]);
            }
            const cleanDate = new Date(yyyy, mm - 1, dd);
            if (!isNaN(cleanDate.getTime())) {
                const rdd = String(cleanDate.getDate()).padStart(2, '0');
                const rmm = String(cleanDate.getMonth() + 1).padStart(2, '0');
                const ryyyy = cleanDate.getFullYear();
                return `${rdd}-${rmm}-${ryyyy}`;
            }
        }

        // 2. Try slash separation (e.g. "04/07/2026")
        const slashParts = dateOnly.split('/');
        if (slashParts.length === 3) {
            let dd, mm, yyyy;
            if (slashParts[0].length === 4) {
                yyyy = parseInt(slashParts[0]);
                mm = parseInt(slashParts[1]);
                dd = parseInt(slashParts[2]);
            } else {
                dd = parseInt(slashParts[0]);
                mm = parseInt(slashParts[1]);
                yyyy = parseInt(slashParts[2]);
            }
            const cleanDate = new Date(yyyy, mm - 1, dd);
            if (!isNaN(cleanDate.getTime())) {
                const rdd = String(cleanDate.getDate()).padStart(2, '0');
                const rmm = String(cleanDate.getMonth() + 1).padStart(2, '0');
                const ryyyy = cleanDate.getFullYear();
                return `${rdd}-${rmm}-${ryyyy}`;
            }
        }

        // 3. Try dash separation (e.g. "2026-07-04" or "04-07-2026")
        const dashParts = dateOnly.split('-');
        if (dashParts.length === 3) {
            let dd, mm, yyyy;
            if (dashParts[0].length === 4) {
                yyyy = parseInt(dashParts[0]);
                mm = parseInt(dashParts[1]);
                dd = parseInt(dashParts[2]);
            } else {
                dd = parseInt(dashParts[0]);
                mm = parseInt(dashParts[1]);
                yyyy = parseInt(dashParts[2]);
            }
            const cleanDate = new Date(yyyy, mm - 1, dd);
            if (!isNaN(cleanDate.getTime())) {
                const rdd = String(cleanDate.getDate()).padStart(2, '0');
                const rmm = String(cleanDate.getMonth() + 1).padStart(2, '0');
                const ryyyy = cleanDate.getFullYear();
                return `${rdd}-${rmm}-${ryyyy}`;
            }
        }
    } catch (e) {
        console.error("Error parsing local date:", dateStr, e);
    }
    return 'Unknown Date';
};

export const getTodayDdMmYyyy = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
};
