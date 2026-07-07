import React from 'react';
import { Plus, Minus } from 'lucide-react';

const TabularDataBuilder = ({
    element,
    handleUpdateNestedField,
    onUpdateField
}) => {
    const particulars = element.particulars || {};
    const tableData = element.tableData || {
        headers: ['Column 1', 'Column 2', 'Column 3'],
        rows: [
            ['', '', ''],
            ['', '', '']
        ]
    };

    const headers = tableData.headers || [];
    const rows = tableData.rows || [];

    const updateTable = (newHeaders, newRows) => {
        onUpdateField('tableData', {
            headers: newHeaders,
            rows: newRows
        });
    };

    const handleAddRow = () => {
        const newRow = Array(headers.length).fill('');
        updateTable(headers, [...rows, newRow]);
    };

    const handleRemoveRow = () => {
        if (rows.length <= 1) return;
        updateTable(headers, rows.slice(0, -1));
    };

    const handleAddColumn = () => {
        const nextColNum = headers.length + 1;
        const newHeaders = [...headers, `Column ${nextColNum}`];
        const newRows = rows.map(r => [...r, '']);
        updateTable(newHeaders, newRows);
    };

    const handleRemoveColumn = () => {
        if (headers.length <= 1) return;
        const newHeaders = headers.slice(0, -1);
        const newRows = rows.map(r => r.slice(0, -1));
        updateTable(newHeaders, newRows);
    };

    const handleHeaderChange = (colIdx, value) => {
        const newHeaders = [...headers];
        newHeaders[colIdx] = value;
        updateTable(newHeaders, rows);
    };

    const handleCellChange = (rowIdx, colIdx, value) => {
        const newRows = rows.map((r, rIdx) => {
            if (rIdx === rowIdx) {
                const newRow = [...r];
                newRow[colIdx] = value;
                return newRow;
            }
            return r;
        });
        updateTable(headers, newRows);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tabular Data Grid Settings</label>
                    <p className="text-slate-500 text-xs">Configure the rows and columns for the student's table.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Rows Controller */}
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-150 shadow-sm">
                        <span className="text-xs font-bold text-slate-600">Rows:</span>
                        <button
                            type="button"
                            onClick={handleRemoveRow}
                            disabled={rows.length <= 1}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-40"
                        >
                            <Minus size={14} />
                        </button>
                        <span className="text-xs font-black text-slate-800 w-4 text-center">{rows.length}</span>
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Columns Controller */}
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-150 shadow-sm">
                        <span className="text-xs font-bold text-slate-600">Cols:</span>
                        <button
                            type="button"
                            onClick={handleRemoveColumn}
                            disabled={headers.length <= 1}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-40"
                        >
                            <Minus size={14} />
                        </button>
                        <span className="text-xs font-black text-slate-800 w-4 text-center">{headers.length}</span>
                        <button
                            type="button"
                            onClick={handleAddColumn}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Grid Editor */}
            <div className="overflow-x-auto rounded-2xl border border-slate-250 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            {headers.map((header, colIdx) => (
                                <th key={colIdx} className="px-3 py-2 text-left">
                                    <input
                                        type="text"
                                        value={header}
                                        onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                                        placeholder={`Header ${colIdx + 1}`}
                                        className="w-full text-xs font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 outline-none pb-0.5"
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                        {rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-slate-50/50">
                                {row.map((cell, colIdx) => (
                                    <td key={colIdx} className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={cell}
                                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                                            placeholder="Empty cell (fillable by student)"
                                            className="w-full text-xs font-medium text-slate-650 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-purple-500 rounded px-1.5 py-1 outline-none transition-all"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <p className="text-[10px] italic text-slate-400 text-right">
                * Note: Pre-filled cells act as static labels. Empty cells will be input fields for the student.
            </p>

            {/* Student Answer Box & Enable It Switch */}
            <div className="flex items-center justify-between bg-white px-3.5 py-3.5 border border-slate-200 rounded-xl shadow-sm">
                {particulars.enableAnswerBox !== false ? (
                    <input
                        type="text"
                        placeholder="Type your Answer here"
                        readOnly
                        tabIndex={-1}
                        className="bg-transparent outline-none flex-1 text-sm border-none font-sans pointer-events-none select-none cursor-default text-slate-400"
                    />
                ) : (
                    <div className="text-slate-400 text-sm italic font-semibold">Student Answer Box Disabled</div>
                )}
                <div className="flex items-center gap-3.5 ml-auto select-none border-l border-slate-150 pl-3.5">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Enable it</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={particulars.enableAnswerBox !== false}
                            onChange={(e) => handleUpdateNestedField('particulars', 'enableAnswerBox', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-650"></div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default TabularDataBuilder;
