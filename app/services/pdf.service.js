import { PDFExtract } from "pdf.js-extract";

const pdfExtract = new PDFExtract();

export const extractTextFromPdf = async (filePath) => {
  const data = await pdfExtract.extract(filePath, {});
  const text = data.pages.map((page) => 
    page.content.map((item) => 
        item.str
    ).join(" ")).join("\n");
  return text;
};
