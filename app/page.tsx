"use client";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function Home() {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (file) {
      console.log("Uploaded file:", file);
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
            onChange={(e) => handleFileUpload(e)}
          />
          <FieldDescription>
            Please upload an Excel file containing the data that you want to
            tabulate. Supported formats are .xlsx and .xls.
          </FieldDescription>
        </Field>
      </div>
    </main>
  );
}
