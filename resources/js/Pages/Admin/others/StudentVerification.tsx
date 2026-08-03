import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // 🚀 FIXED

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Papa from 'papaparse';
import { Upload, Save, Trash2, Plus, FileSpreadsheet, Layers } from 'lucide-react';

interface EditableStudent {
    reg_number: string;
    student_email: string;
    contact: string;
    first_name: string;
    last_name: string;
    faculty: string;
    course: string;
    gender: string;
}

export default function StudentVerification() {
    const [csvData, setCsvData] = useState<EditableStudent[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. File Upload Intake to convert standard CSV strings into structural JSON objects
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Map dirty inputs safely to match our platform structural parameters
                const mappedData = results.data.map((row: any) => ({
                    reg_number: row['registration-number'] || row['reg_number'] || '',
                    student_email: row['student-email'] || row['email'] || '',
                    contact: row['contact'] || row['phone'] || '',
                    first_name: row['first-name'] || row['first_name'] || '',
                    last_name: row['last-name'] || row['last-name'] || '',
                    faculty: row['faculty'] || '',
                    course: row['course'] || '',
                    gender: row['gender'] || '',
                }));
                setCsvData(mappedData);
            }
        });
    };

    // 2. Direct Spreadsheet Grid cell manipulation modification engine
    const handleCellChange = (index: number, field: keyof EditableStudent, value: string) => {
        const updatedMatrix = [...csvData];
        updatedMatrix[index][field] = value;
        setCsvData(updatedMatrix);
    };

    // 3. Add an empty boilerplate record row inside the active workspace
    const addNewRow = () => {
        setCsvData([
            ...csvData,
            { reg_number: '', student_email: '', contact: '', first_name: '', last_name: '', faculty: '', course: '', gender: '' }
        ]);
    };

    // 4. Wipe individual rows from local configuration grids
    const deleteRow = (index: number) => {
        setCsvData(csvData.filter((_, i) => i !== index));
    };

    // 5. Final validation submit dispatch payload method
    const submitSpreadsheetData = () => {
        if (csvData.length === 0) return;
        setIsProcessing(true);

        // 🚀 FIXED: Wrapped explicitly inside an object matching Inertia specs
        const payload = {
            students: csvData as any // Quick type-cast bypasses structural constraints
        };

        router.post(route('admin.verifications.upload'), payload, {
            onFinish: () => setIsProcessing(false),
            onSuccess: () => setCsvData([]) // Clear editor stage upon verified synchronization
        });
    };

    return (
        <AuthenticatedLayout header="Interactive Spreadsheet Sync">
            <Head title="Spreadsheet Verification" />

            {/* Top Operational Commands Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-primary" /> Parse New Documents
                        </CardTitle>
                        <CardDescription>Upload any standard university CSV file to populate the interactive grid.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Input type="file" accept=".csv" onChange={handleFileChange} />
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 shadow-sm flex flex-col justify-center px-6 bg-muted/20">
                    <div className="flex items-center gap-3 justify-end">
                        <Button variant="outline" size="sm" onClick={addNewRow} className="gap-1 text-xs">
                            <Plus className="h-3.5 w-3.5" /> Add Student Row
                        </Button>
                        <Button
                            size="sm"
                            onClick={submitSpreadsheetData}
                            disabled={csvData.length === 0 || isProcessing}
                            className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Save className="h-3.5 w-3.5" /> {isProcessing ? 'Synchronizing...' : 'Save & Verify System'}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Main Interactive Spreadsheet Editor Table Canvas Container */}
            {csvData.length > 0 ? (
                <Card className="shadow-sm overflow-hidden border">
                    <div className="bg-muted/40 px-4 py-2 border-b flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Live Workspace Stage Matrix
                        </span>
                        <Badge variant="secondary" className="text-xs font-mono">{csvData.length} Rows Loaded</Badge>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <Table className="border-collapse">
                            <TableHeader className="bg-background sticky top-0 z-10 border-b">
                                <TableRow>
                                    <TableHead className="w-40 border-r text-xs">Reg Number</TableHead>
                                    <TableHead className="w-44 border-r text-xs">First Name (+ Others)</TableHead>
                                    <TableHead className="w-36 border-r text-xs">Last Name</TableHead>
                                    <TableHead className="w-48 border-r text-xs">Student Email</TableHead>
                                    <TableHead className="w-36 border-r text-xs">Contact</TableHead>
                                    <TableHead className="w-36 border-r text-xs">Faculty</TableHead>
                                    <TableHead className="w-40 border-r text-xs">Course</TableHead>
                                    <TableHead className="w-24 border-r text-xs">Gender</TableHead>
                                    <TableHead className="w-16 text-center text-xs">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {csvData.map((student, index) => (
                                    <TableRow key={index} className="hover:bg-muted/30 odd:bg-muted/10">
                                        {/* Reg Number */}
                                        <TableCell className="p-1 border-r">
                                            <input
                                                value={student.reg_number}
                                                onChange={(e) => handleCellChange(index, 'reg_number', e.target.value)}
                                                className="w-full px-2 py-1 bg-transparent text-sm font-semibold border-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                            />
                                        </TableCell>
                                        {/* First Name */}
                                        <TableCell className="p-1 border-r">
                                            <input
                                                value={student.first_name}
                                                onChange={(e) => handleCellChange(index, 'first_name', e.target.value)}
                                                className="w-full px-2 py-1 bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                            />
                                        </TableCell>
                                        {/* Last Name */}
                                        <TableCell className="p-1 border-r">
                                            <input
                                                value={student.last_name}
                                                onChange={(e) => handleCellChange(index, 'last_name', e.target.value)}
                                                className="w-full px-2 py-1 bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                            />
                                        </TableCell>
                                        {/* Email */}
                                        <TableCell className="p-1 border-r">
                                            <input
                                                value={student.student_email}
                                                onChange={(e) => handleCellChange(index, 'student_email', e.target.value)}
                                                className="w-full px-2 py-1 bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary rounded font-mono text-xs"
                                            />
                                        </TableCell>
                                        {/* Contact */}
                                        <TableCell className="p-1 border-r">
                                            <input
                                                value={student.contact}
                                                onChange={(e) => handleCellChange(index, 'contact', e.target.value)}
                                                className="w-full px-2 py-1 bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                            />
                                        </TableCell>
                                        {/* Faculty */}
                                        <TableCell className="p-1 border-r">
                                            <input
                                                value={student.faculty}
                                                onChange={(e) => handleCellChange(index, 'faculty', e.target.value)}
                                                className="w-full px-2 py-1 bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                            />
                                        </TableCell>
                                        {/* Course */}
                                        <TableCell className="p-1 border-r">
                                            <input
                                                value={student.course}
                                                onChange={(e) => handleCellChange(index, 'course', e.target.value)}
                                                className="w-full px-2 py-1 bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                            />
                                        </TableCell>
                                        {/* Gender */}
                                        <TableCell className="p-1 border-r">
                                            <input
                                                value={student.gender}
                                                onChange={(e) => handleCellChange(index, 'gender', e.target.value)}
                                                className="w-full px-2 py-1 bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary rounded"
                                                placeholder="M / F"
                                            />
                                        </TableCell>
                                        {/* Row Controls */}
                                        <TableCell className="p-1 text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteRow(index)}
                                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            ) : (
                <div className="rounded-xl border border-dashed p-16 text-center bg-background flex flex-col items-center justify-center gap-3">
                    <Layers className="h-10 w-10 text-muted-foreground animate-pulse" />
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">Spreadsheet Canvas is Empty</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            Upload a Comma-Separated Values roster sheet (.csv) to initiate cell modification tools.
                        </p>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
