"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Upload, FileText, Check, AlertCircle, ChevronRight, Download, ArrowLeft, Info, Table, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { DEMO_PROPERTIES } from "@/lib/data";
import { EXPENSE_CATEGORY_CONFIG, type ExpenseCategory } from "@/lib/expense-categories";
import {
  parseCSV,
  autoDetectMappings,
  transformToExpenses,
  SAMPLE_CSV_TEMPLATE,
  generateCSVBlob,
  type ParsedRow,
  type ColumnMapping,
  type ParsedExpense,
} from "@/lib/csv-parser";

type Step = 'upload' | 'mapping' | 'review' | 'importing' | 'success';

interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: null,
    amount: null,
    description: null,
    property: null,
    category: null,
    vendor: null,
    notes: null,
  });
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const propertyNames = DEMO_PROPERTIES.map(p => p.name);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const { headers: parsedHeaders, rows: parsedRows } = parseCSV(content);
      setHeaders(parsedHeaders);
      setRows(parsedRows);
      const detectedMapping = autoDetectMappings(parsedHeaders);
      setMapping(detectedMapping);
      setStep('mapping');
    };
    reader.readAsText(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleDownloadTemplate = () => {
    const blob = generateCSVBlob(SAMPLE_CSV_TEMPLATE);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hostfi-expense-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value || null }));
  };

  const handleProceedToReview = () => {
    const expenses = transformToExpenses(rows, mapping, propertyNames);
    
    // Match property names to IDs
    const expensesWithPropertyIds = expenses.map(expense => {
      const matchedProperty = DEMO_PROPERTIES.find(p => 
        p.name.toLowerCase() === expense.property.toLowerCase() ||
        p.city.toLowerCase() === expense.property.toLowerCase() ||
        expense.property.toLowerCase().includes(p.name.toLowerCase()) ||
        expense.property.toLowerCase().includes(p.city.toLowerCase())
      );
      return {
        ...expense,
        property_id: matchedProperty?.id || '',
      };
    });
    
    setParsedExpenses(expensesWithPropertyIds);
    setStep('review');
  };

  const handleImport = async () => {
    setStep('importing');
    setImportError(null);
    
    const validExpenses = parsedExpenses.filter(e => !e.hasIssue);
    
    // Prepare expenses for API
    const expensesToImport = validExpenses.map(e => ({
      date: e.date,
      amount: e.amount,
      description: e.description,
      property: e.property,
      property_id: (e as ParsedExpense & { property_id?: string }).property_id || '',
      category: e.category,
      vendor: e.vendor,
      notes: e.notes,
    }));

    try {
      const response = await fetch('/api/expenses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: expensesToImport }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setImportResult({
          imported: result.imported,
          skipped: result.skipped,
          duplicates: result.duplicates,
        });
        setStep('success');
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'An error occurred during import');
      setStep('review');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setParsedExpenses([]);
    setImportResult(null);
    setImportError(null);
  };

  const canProceedToReview = mapping.date && mapping.amount && mapping.description && mapping.property;
  const validExpenseCount = parsedExpenses.filter(e => !e.hasIssue).length;
  const issueCount = parsedExpenses.filter(e => e.hasIssue).length;

  return (
    <div className="space-y-8 sm:space-y-10 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Import Expenses</h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          Upload a CSV File to Bulk Import Expenses Into HostFi
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'mapping', 'review', 'success'] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                step === s || step === 'importing' && s === 'review'
                  ? "bg-teal-500 text-white"
                  : (['upload', 'mapping', 'review', 'importing', 'success'].indexOf(step) > ['upload', 'mapping', 'review', 'success'].indexOf(s))
                    ? "bg-teal-100 text-teal-700"
                    : "bg-gray-100 text-gray-400"
              )}
            >
              {(['upload', 'mapping', 'review', 'importing', 'success'].indexOf(step) > ['upload', 'mapping', 'review', 'success'].indexOf(s)) ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                idx + 1
              )}
            </div>
            <span className={cn(
              "hidden sm:inline capitalize",
              (step === s || (step === 'importing' && s === 'review')) ? "font-medium text-foreground" : "text-muted-foreground"
            )}>
              {s}
            </span>
            {idx < 3 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200",
              dragActive
                ? "border-teal-400 bg-teal-50/50"
                : "border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50"
            )}
            style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Upload className={cn("w-6 h-6", dragActive ? "text-teal-500" : "text-muted-foreground/60")} />
            </div>
            <p className="font-medium text-foreground">
              {dragActive ? "Drop your file here" : "Drop your CSV file here, or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Supports CSV files with columns: date, amount, description, property
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Need a template?</p>
                <p className="text-xs text-muted-foreground">Download a sample CSV to get started</p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {fileName}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {rows.length} rows found
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Choose different file
            </button>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden -mx-4 sm:mx-0" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <Table className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview (first 5 rows)</p>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {headers.map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      {headers.map(h => (
                        <td key={h} className="px-4 py-2 whitespace-nowrap">
                          {row[h] || <span className="text-gray-300">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column mapping */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <p className="font-medium">Map your columns to HostFi fields</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'date', label: 'Date', required: true },
                { key: 'amount', label: 'Amount', required: true },
                { key: 'description', label: 'Description', required: true },
                { key: 'property', label: 'Property', required: true },
                { key: 'category', label: 'Category', required: false },
                { key: 'vendor', label: 'Vendor', required: false },
                { key: 'notes', label: 'Notes', required: false },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <select
                    value={mapping[field.key as keyof ColumnMapping] || ''}
                    onChange={(e) => handleMappingChange(field.key as keyof ColumnMapping, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleProceedToReview}
              disabled={!canProceedToReview}
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl text-sm transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Continue to Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Ready to import {validExpenseCount} expenses</p>
              {issueCount > 0 && (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {issueCount} row{issueCount !== 1 ? 's' : ''} with issues will be skipped
                </p>
              )}
            </div>
            <button
              onClick={() => setStep('mapping')}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to mapping
            </button>
          </div>

          {importError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {importError}
            </div>
          )}

          {/* Expenses table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden -mx-4 sm:mx-0" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-hide">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Property</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedExpenses.map((expense, idx) => {
                    const catConfig = expense.category ? EXPENSE_CATEGORY_CONFIG[expense.category] : null;
                    return (
                      <tr key={idx} className={cn("border-b border-gray-50", expense.hasIssue && "bg-red-50/30")}>
                        <td className="px-4 py-3">
                          {expense.hasIssue ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {expense.issueMessage}
                            </span>
                          ) : expense.issueMessage ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {expense.issueMessage}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <Check className="w-3.5 h-3.5" />
                              Ready
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{expense.date || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {expense.amount ? formatCurrency(expense.amount) : '-'}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{expense.description || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{expense.property || '-'}</td>
                        <td className="px-4 py-3">
                          {catConfig ? (
                            <span className="text-xs">{catConfig.label}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Auto-detect</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={validExpenseCount === 0}
              className="min-h-[40px] px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm Import ({validExpenseCount} Expenses)
            </button>
          </div>
        </div>
      )}

      {/* Step 3.5: Importing */}
      {step === 'importing' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-teal-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Importing expenses...</h2>
          <p className="text-muted-foreground">
            Please wait while we process your data
          </p>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && importResult && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-teal-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Successfully imported!</h2>
          <p className="text-muted-foreground mb-2">
            {importResult.imported} expense{importResult.imported !== 1 ? 's' : ''} have been added to HostFi
          </p>
          {(importResult.skipped > 0 || importResult.duplicates > 0) && (
            <p className="text-sm text-muted-foreground">
              {importResult.skipped > 0 && `${importResult.skipped} skipped`}
              {importResult.skipped > 0 && importResult.duplicates > 0 && ' • '}
              {importResult.duplicates > 0 && `${importResult.duplicates} duplicates`}
            </p>
          )}
          <div className="flex justify-center gap-3 mt-6">
            <Link
              href="/dashboard/expenses"
              className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl text-sm transition-colors hover:bg-gray-800"
            >
              View Expenses
            </Link>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white text-foreground font-medium rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
