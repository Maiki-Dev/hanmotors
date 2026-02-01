import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label"; // Assuming we have Label component, or use div
import { Separator } from "../components/ui/separator"; // Assuming we have Separator
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Bell, Lock, User, Mail, Save } from 'lucide-react';

const Settings = () => {
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@hanmotors.mn',
    role: 'Administrator'
  });
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    // Load from local storage if available
    const savedProfile = localStorage.getItem('adminProfile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, []);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPassword({ ...password, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = () => {
    localStorage.setItem('adminProfile', JSON.stringify(profile));
    alert('Мэдээлэл амжилттай хадгалагдлаа!');
    // In a real app, this would trigger a re-fetch or context update in App.jsx
    window.dispatchEvent(new Event('profileUpdated'));
  };

  const handleSavePassword = () => {
    if (password.new !== password.confirm) {
      alert('Шинэ нууц үг таарахгүй байна!');
      return;
    }
    alert('Нууц үг амжилттай солигдлоо!');
    setPassword({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Тохиргоо</h2>
        <p className="text-muted-foreground">
          Админ хэрэглэгчийн мэдээлэл болон нууц үг солих.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">AD</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle>Хувийн мэдээлэл</CardTitle>
                    <CardDescription>
                        Таны нэр болон и-мэйл хаяг
                    </CardDescription>
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
                  onChange={handleProfileChange}
                  className="pl-9"
                  placeholder="name@example.com"
                />
              </div>
            </div>
            <Button onClick={handleSaveProfile} className="w-fit">
              <Save className="mr-2 h-4 w-4" /> Хадгалах
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Нууц үг солих</CardTitle>
            <CardDescription>
              Аюулгүй байдлын үүднээс нууц үгээ тогтмол солино уу.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current">Одоогийн нууц үг</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="current"
                  name="current"
                  type="password"
                  value={password.current}
                  onChange={handlePasswordChange}
                  className="pl-9"
                />
              </div>
            </div>
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
              <Label htmlFor="confirm">Шинэ нууц үг давтах</Label>
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
            <Button onClick={handleSavePassword} variant="outline" className="w-fit">
              Нууц үг шинэчлэх
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;