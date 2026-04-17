import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, Mail, Phone, User, Lock, Eye, EyeOff, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface InviteData {
  token: string;
  new_principal_name: string;
  new_principal_email: string;
  new_principal_mobile: string;
  transfer_mode: string;
  status: string;
  expires_at: string;
}

export default function PrincipalSetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token') || '';

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await usersApi.getPrincipalInvite(token);
        setInvite(data);
      } catch (error: any) {
        toast.error(error.message || 'Invalid or expired invite link');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const getInitials = (name: string) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invite || !token) {
      toast.error('Invite data is not available');
      return;
    }

    if (!password || !confirmPassword) {
      toast.error('Please enter and confirm the password');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.completePrincipalInvite({
        token,
        password,
        confirmPassword,
        avatarFile: avatarFile || undefined,
      });

      await login(invite.new_principal_email, password, 'admin');
      toast.success('Principal profile setup completed');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete setup');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <CardContent className="py-16 text-center text-muted-foreground">
            Loading invitation...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !invite) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <CardHeader>
            <CardTitle>Invite unavailable</CardTitle>
            <CardDescription>
              The principal setup link is missing, invalid, or expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
        <div className="text-primary-foreground space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Principal Setup Link</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold font-display leading-tight">Finish your principal profile setup</h1>
            <p className="mt-4 max-w-xl text-primary-foreground/80 text-lg">
              The account details below were created for you. Set a password, add a profile photo, and sign in to activate the new principal account.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <User className="h-4 w-4" />
                Name
              </div>
              <p className="text-primary-foreground/90">{invite.new_principal_name}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <p className="text-primary-foreground/90 break-all">{invite.new_principal_email}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Phone className="h-4 w-4" />
                Mobile
              </div>
              <p className="text-primary-foreground/90">{invite.new_principal_mobile}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Shield className="h-4 w-4" />
                Transfer Type
              </div>
              <p className="text-primary-foreground/90 capitalize">{invite.transfer_mode}</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <Avatar className="mx-auto mb-4 h-16 w-16 border">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(invite.new_principal_name)}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl font-display">Create Your Password</CardTitle>
            <CardDescription>
              Upload a photo and set the password for your new principal account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="principalPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="principalPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="principalConfirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="principalConfirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm the password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="principalAvatar">Profile Photo</Label>
                <Input
                  id="principalAvatar"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Optional, but recommended for the principal account.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating Account...' : 'Finish Setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
