"use client";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const contentType = res.headers.get("Content-Type") ?? "";
        const errorMsg = contentType.includes("application/json")
          ? (await res.json()).error
          : await res.text();
        throw new Error(errorMsg);
      }

      // Trigger a download of the returned file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "result.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div className="flex flex-col items-start justify-start gap-4 w-full max-w-2xl mx-auto py-10">
        <h1>Upload Excel File</h1>
        <Field>
          <FieldLabel>Excel File</FieldLabel>
          <Input
            id="excel-file"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={loading}
          />
          <FieldDescription>
            Please upload an Excel file containing the data that you want to
            tabulate. Supported formats are .xlsx and .xls.
          </FieldDescription>
        </Field>
        {loading && <p className="text-sm text-gray-500">Processing...</p>}
        {error && <p className="text-sm text-red-500">Error: {error}</p>}
      </div>
    </main>
  );
}
