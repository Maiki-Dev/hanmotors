import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Eye, Check, X } from 'lucide-react';

const DocumentVerification = () => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const documents = [
    {
      id: "DOC-001",
      driver: "Г.Тулга",
      type: "Driver's License",
      status: "pending",
      submittedDate: "2024-02-01 09:30",
      image: "https://via.placeholder.com/600x400?text=Drivers+License",
    },
    {
      id: "DOC-002",
      driver: "Г.Тулга",
      type: "Vehicle Registration",
      status: "pending",
      submittedDate: "2024-02-01 09:35",
      image: "https://via.placeholder.com/600x400?text=Vehicle+Registration",
    },
    {
      id: "DOC-003",
      driver: "С.Сүх",
      type: "Insurance",
      status: "rejected",
      submittedDate: "2024-01-30 14:00",
      image: "https://via.placeholder.com/600x400?text=Insurance",
    },
  ];

  const handleView = (doc) => {
    setSelectedDoc(doc);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedDoc(null);
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
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.id}</TableCell>
                  <TableCell>{doc.driver}</TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>{doc.submittedDate}</TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleView(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-green-600 hover:text-green-700">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-red-600 hover:text-red-700">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedDoc && (
            <DialogContent className="sm:max-w-[600px]" onClose={handleClose}>
                <DialogHeader>
                    <DialogTitle>Баримт бичиг: {selectedDoc.type}</DialogTitle>
                    <DialogDescription>
                        Жолооч: {selectedDoc.driver} | ID: {selectedDoc.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted relative">
                        {/* Placeholder for image */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                            {selectedDoc.type} Image Preview
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="destructive" onClick={handleClose}>Татгалзах</Button>
                    <Button onClick={handleClose}>Баталгаажуулах</Button>
                </DialogFooter>
            </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default DocumentVerification;
