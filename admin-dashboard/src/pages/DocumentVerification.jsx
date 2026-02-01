import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Eye, Check, X } from 'lucide-react';
import api from '../services/api';

const DocumentVerification = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/admin/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Poll every 10 seconds for updates
    const interval = setInterval(fetchDocuments, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleView = (doc) => {
    setSelectedDoc(doc);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedDoc(null);
  };

  const handleStatusUpdate = async (doc, status) => {
    try {
      await api.post(`/admin/documents/${doc.driverId}/${doc.type}/status`, { status });
      fetchDocuments();
      if (selectedDoc && selectedDoc.id === doc.id) {
        handleClose();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">Баталгаажсан</Badge>;
      case 'pending': return <Badge className="bg-yellow-600">Хүлээгдэж буй</Badge>;
      case 'rejected': return <Badge variant="destructive">Татгалзсан</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight text-primary">Баримт бичиг шалгах</h2>

      <Card>
        <CardHeader>
          <CardTitle>Шалгах жагсаалт</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Жолооч</TableHead>
                <TableHead>Төрөл</TableHead>
                <TableHead>Огноо</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Баримт бичиг байхгүй байна
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.id.substring(0, 8)}...</TableCell>
                    <TableCell>{doc.driver}</TableCell>
                    <TableCell>{doc.type === 'license' ? 'Жолооны үнэмлэх' : doc.type === 'vehicleRegistration' ? 'Тээврийн гэрчилгээ' : doc.type}</TableCell>
                    <TableCell>{new Date(doc.submittedDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleView(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleStatusUpdate(doc, 'approved')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleStatusUpdate(doc, 'rejected')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedDoc && (
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Баримт бичиг: {selectedDoc.type === 'license' ? 'Жолооны үнэмлэх' : 'Тээврийн гэрчилгээ'}</DialogTitle>
                    <DialogDescription>
                        Жолооч: {selectedDoc.driver}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted relative flex items-center justify-center">
                        {selectedDoc.image ? (
                            <img 
                              src={selectedDoc.image} 
                              alt={selectedDoc.type} 
                              className="max-w-full max-h-full object-contain" 
                            />
                        ) : (
                            <div className="text-muted-foreground">Зураг алга</div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="destructive" onClick={() => handleStatusUpdate(selectedDoc, 'rejected')}>Татгалзах</Button>
                    <Button onClick={() => handleStatusUpdate(selectedDoc, 'approved')}>Баталгаажуулах</Button>
                </DialogFooter>
            </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default DocumentVerification;
