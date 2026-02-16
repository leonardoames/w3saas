import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export interface ImportRow {
  data: string;
  investimento: number;
  sessoes: number;
  pedidos_pagos: number;
  receita_paga: number;
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ImportRow[];
  onConfirm: () => void;
  importing: boolean;
  result?: { created: number; updated: number } | null;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ImportPreviewDialog({ open, onOpenChange, rows, onConfirm, importing, result }: ImportPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview da Importação</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-lg font-semibold text-foreground">Importação concluída!</p>
            <p className="text-sm text-muted-foreground">
              {result.created + result.updated} registros processados
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{rows.length} linhas encontradas</p>
            <div className="overflow-auto flex-1 rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs text-right">Investido</TableHead>
                    <TableHead className="text-xs text-right">Sessões</TableHead>
                    <TableHead className="text-xs text-right">Pedidos</TableHead>
                    <TableHead className="text-xs text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{row.data}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">R$ {fmt(row.investimento)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{row.sessoes}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{row.pedidos_pagos}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">R$ {fmt(row.receita_paga)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 50 && (
                <p className="text-xs text-muted-foreground p-2 text-center">Mostrando 50 de {rows.length} linhas</p>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button onClick={onConfirm} disabled={importing || rows.length === 0}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Importação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
