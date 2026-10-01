'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DocumentUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('contrato');
  const [category, setCategory] = useState('legal');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: 'Error', description: 'Selecciona un archivo' });
      return;
    }

    const resolvedTitle = title.trim() || file.name;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', resolvedTitle);
      formData.append('documentType', docType);
      formData.append('category', category);
      if (expiryDate) formData.append('expiryDate', expiryDate);

      const res = await fetch('/api/legal/documentos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('La carga falló');
      }

      await res.json();
      toast({ title: 'Éxito', description: `Documento cargado: ${resolvedTitle}` });
      setFile(null);
      setTitle('');
      setExpiryDate('');
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'La carga falló' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4 rounded-lg border p-4">
      <div>
        <label className="text-sm font-medium">Título del documento</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Contrato de servicio 2026"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Seleccionar documento</label>
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.doc,.docx,.xls"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Tipo de documento</label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contrato">Contrato</SelectItem>
            <SelectItem value="normativa">Normativa</SelectItem>
            <SelectItem value="politica">Política</SelectItem>
            <SelectItem value="procedimiento">Procedimiento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Categoría</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="legal">Legal</SelectItem>
            <SelectItem value="compliance">Cumplimiento</SelectItem>
            <SelectItem value="operacional">Operacional</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Vencimiento</label>
        <Input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Opcional. Si el documento no tiene vencimiento acreditado, se deja sin fecha.
        </p>
      </div>
      <Button type="submit" disabled={loading} className="gap-2">
        <Upload className="h-4 w-4" />
        {loading ? 'Cargando...' : 'Cargar'}
      </Button>
    </form>
  );
}
