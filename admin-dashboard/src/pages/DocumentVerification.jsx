import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Eye, Check, X, FileText, Car, Shield } from 'lucide-react';
import api from '../services/api';

const DocumentVerification = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('license');

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/admin/documents');
      setDrivers(response.data);
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

  const handleView = (driver) => {
    setSelectedDriver(driver);
    setActiveTab('license'); // Reset to first tab
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedDriver(null);
  };

  const handleStatusUpdate = async (driverId, docType, status) => {
    try {
      await api.post(`/admin/documents/${driverId}/${docType}/status`, { status });
      
      // Update local state immediately for better UX
      if (selectedDriver && selectedDriver._id === driverId) {
        setSelectedDriver(prev => ({
            ...prev,
            documents: {
                ...prev.documents,
                [docType]: {
                    ...prev.documents[docType],
                    status: status
                }
            }
        }));
      }
      
      fetchDocuments();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">Баталгаажсан</Badge>;
      case 'pending': return <Badge className="bg-yellow-600">Хүлээгдэж буй</Badge>;
      case 'rejected': return <Badge variant="destructive">Татгалзсан</Badge>;
      default: return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  const getOverallStatus = (docs) => {
    const statuses = [docs.license?.status, docs.vehicleRegistration?.status, docs.insurance?.status];
    if (statuses.includes('rejected')) return <Badge variant="destructive">Татгалзсан</Badge>;
    if (statuses.includes('pending')) return <Badge className="bg-yellow-600">Хүлээгдэж буй</Badge>;
    if (statuses.every(s => s === 'approved')) return <Badge className="bg-green-600">Баталгаажсан</Badge>;
    return <Badge variant="outline">Дутуу</Badge>;
  };

  const renderDocumentTab = (type, label, icon) => {
    const doc = selectedDriver?.documents?.[type];
    if (!doc || !doc.url) return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            {icon}
            <span className="mt-2">Зураг оруулаагүй байна</span>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="font-semibold">{label}</h3>
                </div>
                {getStatusBadge(doc.status)}
            </div>
            
            <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted relative flex items-center justify-center bg-black/5">
                <img 
                    src={doc.url} 
                    alt={label} 
                    className="max-w-full max-h-full object-contain" 
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button 
                    variant="outline" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => handleStatusUpdate(selectedDriver._id, type, 'rejected')}
                >
                    <X className="mr-2 h-4 w-4" />
                    Татгалзах
                </Button>
                <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusUpdate(selectedDriver._id, type, 'approved')}
                >
                    <Check className="mr-2 h-4 w-4" />
                    Баталгаажуулах
                </Button>
            </div>
        </div>
    );
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
                <TableHead>Жолооч</TableHead>
                <TableHead>Илгээсэн огноо</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Баримт бичиг байхгүй байна
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver) => (
                  <TableRow key={driver._id}>
                    <TableCell className="font-medium">
                        <div>{driver.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {driver._id?.substring(0, 8)}...</div>
                    </TableCell>
                    <TableCell>{new Date(driver.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{getOverallStatus(driver.documents || {})}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleView(driver)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Харах
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedDriver && (
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Баримт бичиг шалгах: {selectedDriver.name}</DialogTitle>
                    <DialogDescription>
                        Жолоочийн илгээсэн бичиг баримтуудыг шалгаж баталгаажуулна уу.
                    </DialogDescription>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="license">
                            Жолооны үнэмлэх
                        </TabsTrigger>
                        <TabsTrigger value="registration">
                            Тээврийн гэрчилгээ
                        </TabsTrigger>
                        <TabsTrigger value="insurance">
                            Даатгал
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="license" className="mt-4">
                        {renderDocumentTab('license', 'Жолооны үнэмлэх', <FileText className="h-5 w-5" />)}
                    </TabsContent>
                    
                    <TabsContent value="registration" className="mt-4">
                        {renderDocumentTab('vehicleRegistration', 'Тээврийн гэрчилгээ', <Car className="h-5 w-5" />)}
                    </TabsContent>
                    
                    <TabsContent value="insurance" className="mt-4">
                        {renderDocumentTab('insurance', 'Даатгал', <Shield className="h-5 w-5" />)}
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Хаах</Button>
                </DialogFooter>
            </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default DocumentVerification;