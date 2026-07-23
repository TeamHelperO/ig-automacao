import "server-only";

/**
 * Extrai texto de um arquivo enviado pro conhecimento da IA, de acordo
 * com a extensão. Suporta .pdf, .docx, .xlsx/.xls/.csv e .txt/.md.
 * .doc antigo (binário, pré-2007) não tem parser confiável — pedimos
 * pra converter pra .docx ou colar o texto direto.
 */
export async function extractTextFromFile(params: {
  filename: string;
  buffer: Buffer;
}): Promise<string> {
  const ext = params.filename.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(params.buffer);
    return result.text;
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: params.buffer });
    return result.value;
  }

  if (ext === "doc") {
    throw new Error(
      "Arquivos .doc antigos (Word 97-2003) não são suportados. Salva como .docx ou cola o texto direto."
    );
  }

  if (["xlsx", "xls", "csv"].includes(ext)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(params.buffer, { type: "buffer" });
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) parts.push(`[Planilha: ${sheetName}]\n${csv}`);
    }
    return parts.join("\n\n");
  }

  if (["txt", "md"].includes(ext)) {
    return params.buffer.toString("utf-8");
  }

  throw new Error(`Tipo de arquivo .${ext} não suportado. Use PDF, DOCX, XLSX, CSV ou TXT.`);
}
