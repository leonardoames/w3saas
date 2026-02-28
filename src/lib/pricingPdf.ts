import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProductInputs } from "@/pages/Calculadora";

interface Results {
  sellingPrice: number;
  productCost: number;
  pcts: Record<string, number>;
  values: Record<string, number>;
  custoVendaTotal: number;
  custoTotal: number;
  margemRS: number;
  margemPct: number;
}

const costLabels: Record<string, string> = {
  mediaCost: "Custo de Mídia",
  fixedCosts: "Custos Fixos",
  taxes: "Impostos",
  gatewayFee: "Taxa do Gateway",
  platformFee: "Taxa da Plataforma",
  extraFees: "Taxas Extras",
};

export function generatePricingPDF(inputs: ProductInputs, results: Results) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const productName = inputs.title?.trim() || "Sem título";

  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Precificação: ${productName}`, 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Mentoria AMES / W3 — ${dateStr}`, 14, y);
  y += 10;

  // Product info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Produto", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Preço de Venda: R$ ${results.sellingPrice.toFixed(2)}`, 14, y);
  y += 5;
  doc.text(`Custo do Produto: R$ ${results.productCost.toFixed(2)}`, 14, y);
  y += 10;

  // Costs table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Custos Percentuais", 14, y);
  y += 2;

  const tableBody = Object.keys(costLabels).map((key) => [
    costLabels[key],
    `${results.pcts[key].toFixed(1)}%`,
    `R$ ${results.values[key].toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Item", "%", "R$"]],
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [244, 122, 20], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 40, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Results section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resultados", 14, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const resultLines = [
    ["Custo Venda Total", `R$ ${results.custoVendaTotal.toFixed(2)}`],
    ["Custo Total", `R$ ${results.custoTotal.toFixed(2)}`],
    ["Margem (R$)", `R$ ${results.margemRS.toFixed(2)}`],
    ["Margem (%)", `${results.margemPct.toFixed(1)}%`],
  ];

  resultLines.forEach(([label, val], i) => {
    const isMargem = i >= 2;
    if (isMargem) {
      doc.setFont("helvetica", "bold");
      if (results.margemRS < 0) doc.setTextColor(220, 50, 50);
      else doc.setTextColor(30, 160, 100);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
    }
    doc.text(`${label}:`, 14, y);
    doc.text(val, pageW - 14, y, { align: "right" });
    y += 6;
  });

  // Footer
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Gerado pela Precificadora W3 — Mentoria AMES", 14, 285);

  const safeName = productName.replace(/[^a-zA-Z0-9À-ú ]/g, "").trim().replace(/\s+/g, "_");
  doc.save(`Precificacao_${safeName}_${now.toISOString().slice(0, 10)}.pdf`);
}
