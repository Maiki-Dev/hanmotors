import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Search, Pencil, Trash2, MoreHorizontal, Eye, User, Phone, Mail, Lock, Wallet } from 'lucide-react';
import { userService } from '../services/userService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useToast } from '../context/ToastContext';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    wallet: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast({
        title: "Алдаа",
        description: "Хэрэглэгчийн жагсаалт авахад алдаа гарлаа",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      wallet: user.wallet || 0
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleSave = async () => {
    try {
      const updatedUser = await userService.updateUser(selectedUser._id, formData);
      setUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u));
      setIsEditOpen(false);
      toast({
        title: "Амжилттай",
        description: "Хэрэглэгчийн мэдээлэл шинэчлэгдлээ",
        status: "success"
      });
    } catch (error) {
      console.error("Failed to update user", error);
      toast({
        title: "Алдаа",
        description: "Мэдээлэл шинэчлэхэд алдаа гарлаа",
        status: "error"
      });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await userService.deleteUser(selectedUser._id);
      setUsers(prev => prev.filter(u => u._id !== selectedUser._id));
      setIsDeleteOpen(false);
      toast({
        title: "Амжилттай",
        description: "Хэрэглэгч устгагдлаа",
        status: "success"
      });
    } catch (error) {
      console.error("Failed to delete user", error);
      toast({
        title: "Алдаа",
        description: "Устгахад алдаа гарлаа",
        status: "error"
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Хэрэглэгчийн удирдлага</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Нийт хэрэглэгчид ({users.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Хайх..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Имэйл</TableHead>
                <TableHead>Хэтэвч</TableHead>
                <TableHead className="text-right">Бүртгүүлсэн</TableHead>
                <TableHead className="w-[100px] text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.name || '-'}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                       {user.wallet?.toLocaleString()}₮
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Үйлдэл</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(user)}>
                          <Pencil className="mr-2 h-4 w-4" /> Засах
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(user)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Устгах
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Хэрэглэгчийн мэдээлэл засах</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Нэр</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Утас</Label>
              <Input 
                id="phone" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Имэйл</Label>
              <Input 
                id="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wallet">Хэтэвч (₮)</Label>
              <div className="relative">
                <Wallet className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="wallet" 
                  type="number"
                  value={formData.wallet} 
                  onChange={(e) => setFormData({...formData, wallet: Number(e.target.value)})} 
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsEditOpen(false)}>Болих</Button>
             <Button onClick={handleSave}>Хадгалах</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Хэрэглэгч устгах</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Та энэ хэрэглэгчийг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Болих</Button>
             <Button variant="destructive" onClick={handleConfirmDelete}>Устгах</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
