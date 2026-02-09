
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { AlertCircle } from "lucide-react";
import logo from "../assets/logo.png";
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is approved
      // We can check the profile here or rely on the AuthContext redirecting if not approved
      // For now, let's just navigate to home, and App.jsx will handle protection
      toast({
        title: "Амжилттай",
        description: "Системд амжилттай нэвтэрлээ",
        status: "success"
      });
      navigate('/');
    } catch (err) {
      toast({
        title: "Нэвтрэх алдаа",
        description: err.message,
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          
          <CardTitle className="text-2xl font-bold text-center">KHAN MOTORS ADMIN</CardTitle>
          <CardDescription className="text-center">
            Админ системд нэвтрэх
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Имэйл</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Нууц үг</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Уншиж байна...' : 'Нэвтрэх'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Хэрэв танд нэвтрэх эрх байхгүй бол<br/>
            <span className="text-primary font-medium">Админтай холбогдоно уу</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
