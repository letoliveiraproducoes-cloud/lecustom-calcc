import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#23395d] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="space-y-1 flex flex-col items-center text-center pb-8">
          <div className="relative w-24 h-24 mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <path d="M50 15 L80 30 L50 45 L20 30 Z" fill="#f2c94c" />
              <path d="M20 30 L50 45 L50 80 L20 65 Z" fill="#69bfa8" />
              <path d="M80 30 L50 45 L50 80 L80 65 Z" fill="#d94855" />
              <path d="M50 30 L65 37.5 L50 45 L35 37.5 Z" fill="#23395d" />
              <path d="M35 37.5 L50 45 L50 60 L35 52.5 Z" fill="#23395d" />
              <path d="M65 37.5 L50 45 L50 60 L65 52.5 Z" fill="#23395d" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            <span className="text-[#69bfa8]">Le</span>
            <span className="text-[#f2c94c]">Custom</span>
          </CardTitle>
          <CardDescription>
            Acesso restrito. Insira suas credenciais.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@lecustom.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-[#f2c94c] text-[#23395d] hover:bg-[#f2c94c]/90 font-bold" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
