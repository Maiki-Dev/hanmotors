
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Bell, Lock, User, Mail, Save, ShieldCheck, CheckCircle, XCircle, Edit, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";

const Settings = () => {
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Profile State
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    avatar_url: ''
  });
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  
  // Password State
  const [password, setPassword] = useState({
    new: '',
    confirm: ''
  });

  // Admin Users State
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Edit User Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    role: 'editor',
    status: 'pending'
  });

  useEffect(() => {
    if (authProfile) {
      setProfile({
        name: authProfile.full_name || '',
        email: authProfile.email || user?.email || '',
        role: authProfile.role || 'editor'
      });
    }
  }, [authProfile, user]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchAdminUsers();
    }
  }, [activeTab]);

  const fetchAdminUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      
      // Upload to Cloudinary
      const publicUrl = await uploadToCloudinary(file);

      // Update profile in DB
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Update local state and context
      setProfile({ ...profile, avatar_url: publicUrl });
      refreshProfile();
      alert('Зураг амжилттай шинэчлэгдлээ!');
      
    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPassword({ ...password, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ full_name: profile.name })
        .eq('id', user.id);

      if (error) throw error;
      alert('Мэдээлэл амжилттай хадгалагдлаа!');
      refreshProfile();
    } catch (error) {
      alert('Алдаа: ' + error.message);
    }
  };

  const handleSavePassword = async () => {
    if (password.new !== password.confirm) {
      alert('Шинэ нууц үг таарахгүй байна!');
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({ password: password.new });
      if (error) throw error;
      alert('Нууц үг амжилттай солигдлоо!');
      setPassword({ new: '', confirm: '' });
    } catch (error) {
      alert('Алдаа: ' + error.message);
    }
  };

  const updateUserStatus = async (userId, newStatus) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      fetchAdminUsers();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">Баталгаажсан</Badge>;
      case 'pending': return <Badge className="bg-yellow-600">Хүлээгдэж буй</Badge>;
      case 'suspended': return <Badge variant="destructive">Түдгэлзүүлсэн</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      role: user.role || 'editor',
      status: user.status || 'pending'
    });
    setIsEditOpen(true);
  };

  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSaveUserChanges = async () => {
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ 
          role: editForm.role,
          status: editForm.status
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      
      alert('Хэрэглэгчийн мэдээлэл шинэчлэгдлээ!');
      setIsEditOpen(false);
      fetchAdminUsers();
    } catch (error) {
      alert('Алдаа: ' + error.message);
    }
  };

  const isSuperAdmin = profile.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Тохиргоо</h2>
        <p className="text-muted-foreground">
          Админ хэрэглэгчийн мэдээлэл болон эрхийн удирдлага.
        </p>
      </div>

      <Tabs className="w-full">
        <TabsList>
          <TabsTrigger isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
            <User className="w-4 h-4 mr-2" /> Хувийн мэдээлэл
          </TabsTrigger>
          <TabsTrigger isActive={activeTab === 'users'} onClick={() => setActiveTab('users')}>
            <ShieldCheck className="w-4 h-4 mr-2" /> Админ эрх
          </TabsTrigger>
        </TabsList>

        <TabsContent isActive={activeTab === 'profile'} className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <Avatar className="h-16 w-16 border-2 border-primary/20 group-hover:opacity-75 transition-opacity">
                        <AvatarImage src={profile.avatar_url || "/placeholder-user.jpg"} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                          {profile.name?.substring(0,2).toUpperCase() || 'AD'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/20">
                        <Camera className="h-6 w-6 text-white drop-shadow-md" />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        className="hidden"
                        accept="image/*"
                        disabled={uploading}
                    />
                  </div>
                  <div>
                      <CardTitle>Хувийн мэдээлэл</CardTitle>
                      <CardDescription>
                          Таны нэр болон и-мэйл хаяг
                      </CardDescription>
                      <Badge variant="outline" className="mt-2 capitalize">
                        {profile?.role === 'super_admin' ? 'Super Admin' : 'Admin / Editor'}
                      </Badge>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Нэр</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    className="pl-9"
                    placeholder="Нэр"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">И-мэйл</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    value={profile.email}
                    disabled
                    className="pl-9 bg-muted"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} className="gap-2">
                  <Save className="h-4 w-4" /> Хадгалах
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Нууц үг солих</CardTitle>
              <CardDescription>
                Аюулгүй байдлын үүднээс нууц үгээ тогтмол солино уу
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="new">Шинэ нууц үг</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new"
                    name="new"
                    type="password"
                    value={password.new}
                    onChange={handlePasswordChange}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm">Нууц үг давтах</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    value={password.confirm}
                    onChange={handlePasswordChange}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleSavePassword} className="gap-2">
                  <Lock className="h-4 w-4" /> Нууц үг шинэчлэх
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent isActive={activeTab === 'users'} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Админ хэрэглэгчид</CardTitle>
              <CardDescription>
                Системд нэвтрэх эрхтэй хэрэглэгчдийн жагсаалт
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-4">Уншиж байна...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Нэр</TableHead>
                      <TableHead>Имэйл</TableHead>
                      <TableHead>Үүрэг</TableHead>
                      <TableHead>Төлөв</TableHead>
                      <TableHead>Огноо</TableHead>
                      {isSuperAdmin && <TableHead className="text-right">Үйлдэл</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || '-'}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(u.status)}</TableCell>
                        <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openEditModal(u)}
                              >
                                <Edit className="h-4 w-4 mr-1" /> Засах
                              </Button>
                              {u.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => updateUserStatus(u.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Зөвшөөрөх
                                </Button>
                              )}
                              {u.status === 'approved' && u.role !== 'super_admin' && (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => updateUserStatus(u.id, 'suspended')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" /> Түдгэлзүүлэх
                                </Button>
                              )}
                               {u.status === 'suspended' && (
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => updateUserStatus(u.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Сэргээх
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Хэрэглэгчийн мэдээлэл засах</DialogTitle>
            <DialogDescription>
              Хэрэглэгчийн эрх болон төлөвийг өөрчлөх.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Нэр</Label>
                <Input value={editingUser.full_name || ''} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>Имэйл</Label>
                <Input value={editingUser.email || ''} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Эрх (Role)</Label>
                <select
                  id="role"
                  name="role"
                  value={editForm.role}
                  onChange={handleEditFormChange}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="editor">Admin (Editor)</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Төлөв (Status)</Label>
                <select
                  id="status"
                  name="status"
                  value={editForm.status}
                  onChange={handleEditFormChange}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="pending">Хүлээгдэж буй (Pending)</option>
                  <option value="approved">Баталгаажсан (Approved)</option>
                  <option value="suspended">Түдгэлзүүлсэн (Suspended)</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleSaveUserChanges}>Хадгалах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
