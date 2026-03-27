import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@/types/grievance';
import { 
  GraduationCap, 
  UserCog, 
  Shield, 
  Mail, 
  Lock,
  ArrowRight,
  CheckCircle2,
  User,
  Building,
  Phone,
  IdCard,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/services/api';

const roleConfig: Record<UserRole, { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  description: string;
  features: string[];
}> = {
  student: {
    icon: GraduationCap,
    title: 'Student',
    description: 'Submit and track your grievances',
    features: ['Submit complaints', 'Track status', 'View history'],
  },
  staff: {
    icon: UserCog,
    title: 'Staff',
    description: 'Review and resolve grievances',
    features: ['Review complaints', 'Update status', 'Communicate with students'],
  },
  admin: {
    icon: Shield,
    title: 'Admin',
    description: 'Full system administration',
    features: ['View analytics', 'Manage escalations', 'User management'],
  },
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Registration form fields
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerDepartment, setRegisterDepartment] = useState('');
  const [registerRole, setRegisterRole] = useState<'student' | 'staff'>('student');
  const [registerMobile, setRegisterMobile] = useState('');
  const [registerStudentId, setRegisterStudentId] = useState('');
  const [registerEmployeeId, setRegisterEmployeeId] = useState('');
  const [registerDesignation, setRegisterDesignation] = useState('');

  const departments = [
    'COMPUTER SCIENCE AND ENGINEERING',
    'ELECTRONICS AND COMMUNICATION ENGINEERING',
    'ELECTRICAL AND ELECTRONICS ENGINEERING',
    'MECHANICAL ENGINEERING',
    'CIVIL ENGINEERING',
    'INFORMATION TECHNOLOGY',
    'LIBRARY',
    'MENS HOSTEL',
    'WOMENS HOSTEL',
    'CANTEEN'
  ];

  const studentDepartments = [
    'COMPUTER SCIENCE AND ENGINEERING',
    'ELECTRONICS AND COMMUNICATION ENGINEERING',
    'ELECTRICAL AND ELECTRONICS ENGINEERING',
    'MECHANICAL ENGINEERING',
    'CIVIL ENGINEERING',
    'INFORMATION TECHNOLOGY'
  ];

  const staffDesignations = [
    'Head Of The Department',
    'Faculty In Charge'
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter your credentials');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(email, password, selectedRole);
      
      if (success) {
        toast.success('Welcome back!', {
          description: `Logged in as ${roleConfig[selectedRole].title}`,
        });
        navigate('/dashboard');
      } else {
        toast.error('Login failed', {
          description: 'Please check your credentials and try again.',
        });
      }
    } catch (error: any) {
      toast.error('Login failed', {
        description: error?.message || 'Please check your credentials and try again.',
      });
    }
    
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerName || !registerEmail || !registerPassword || !registerDepartment || !registerMobile) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (registerRole === 'student' && !registerStudentId) {
      toast.error('Please enter your Student ID');
      return;
    }

    if (registerRole === 'staff' && !registerEmployeeId) {
      toast.error('Please enter your Employee ID');
      return;
    }

    if (registerRole === 'staff' && !registerDesignation) {
      toast.error('Please select your designation');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (registerPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      await authApi.register({
        email: registerEmail,
        password: registerPassword,
        name: registerName,
        role: registerRole,
        department: registerDepartment,
        mobile: registerMobile,
        studentId: registerRole === 'student' ? registerStudentId : undefined,
        employeeId: registerRole === 'staff' ? registerEmployeeId : undefined,
        designation: registerRole === 'staff' ? registerDesignation : undefined,
      });
      
      if (registerRole === 'staff') {
        toast.success('Registration submitted!', {
          description: 'Your account is pending approval by the Principal. You will be able to login once approved.',
          duration: 6000,
        });
      } else {
        toast.success('Account created successfully!', {
          description: 'You can now sign in with your credentials.',
        });
      }
      
      // Switch to login mode and pre-fill email
      setIsRegisterMode(false);
      setEmail(registerEmail);
      setSelectedRole(registerRole);
      
      // Clear registration form
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterDepartment('');
      setRegisterMobile('');
      setRegisterStudentId('');
      setRegisterEmployeeId('');
      setRegisterDesignation('');
    } catch (error: any) {
      toast.error('Registration failed', {
        description: error.message || 'Please try again.',
      });
    }
    
    setIsLoading(false);
  };

  const RoleIcon = isRegisterMode 
    ? (registerRole === 'student' ? GraduationCap : UserCog) 
    : roleConfig[selectedRole].icon;

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block text-primary-foreground animate-fade-in">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center shadow-lg">
                <span className="text-accent-foreground font-bold text-xl">G</span>
              </div>
              <h1 className="text-3xl font-bold font-display">Grievance Portal</h1>
            </div>
            <p className="text-xl text-primary-foreground/80 max-w-md">
              A transparent and efficient system for addressing student concerns and complaints.
            </p>
          </div>
          
          <div className="space-y-4">
            {[
              'Quick grievance submission with tracking',
              'Anonymous reporting option available',
              'Real-time status updates & notifications',
              'Secure and confidential handling',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent" />
                <span className="text-primary-foreground/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login/Register Form */}
        <Card className="shadow-xl border-0 animate-slide-up">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/5 flex items-center justify-center">
              <RoleIcon className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">
              {isRegisterMode ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isRegisterMode 
                ? 'Register as a student or faculty member' 
                : 'Sign in to access your grievance portal'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {!isRegisterMode ? (
              <>
                {/* Role Selection for Login */}
                <Tabs 
                  value={selectedRole} 
                  onValueChange={(v) => setSelectedRole(v as UserRole)}
                  className="mb-6"
                >
                  <TabsList className="grid grid-cols-3 w-full">
                    {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                      const Icon = roleConfig[role].icon;
                      return (
                        <TabsTrigger 
                          key={role} 
                          value={role}
                          className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{roleConfig[role].title}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <a href="#" className="text-xs text-accent hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="hero" 
                    className="w-full mt-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Sign in as {roleConfig[selectedRole].title}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* Switch to Register */}
                <div className="mt-6 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <button 
                      onClick={() => setIsRegisterMode(true)}
                      className="text-accent hover:underline font-medium"
                    >
                      Create one
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Registration Form */}
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Role Selection for Registration */}
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={registerRole === 'student' ? 'default' : 'outline'}
                        className="flex items-center gap-2"
                        onClick={() => {
                          setRegisterRole('student');
                          setRegisterDepartment('');
                        }}
                      >
                        <GraduationCap className="h-4 w-4" />
                        Student
                      </Button>
                      <Button
                        type="button"
                        variant={registerRole === 'staff' ? 'default' : 'outline'}
                        className="flex items-center gap-2"
                        onClick={() => {
                          setRegisterRole('staff');
                          setRegisterDepartment('');
                        }}
                      >
                        <UserCog className="h-4 w-4" />
                        Faculty/Staff
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerName"
                        type="text"
                        placeholder="Full Name"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="Email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerMobile">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerMobile"
                        type="tel"
                        placeholder="Mobile Number"
                        value={registerMobile}
                        onChange={(e) => setRegisterMobile(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {registerRole === 'student' ? (
                    <div className="space-y-2">
                      <Label htmlFor="registerStudentId">Student ID</Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="registerStudentId"
                          type="text"
                          placeholder="Student ID"
                          value={registerStudentId}
                          onChange={(e) => setRegisterStudentId(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="registerEmployeeId">Employee ID</Label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="registerEmployeeId"
                            type="text"
                            placeholder="Employee ID"
                            value={registerEmployeeId}
                            onChange={(e) => setRegisterEmployeeId(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="registerDesignation">Designation</Label>
                        <Select value={registerDesignation} onValueChange={setRegisterDesignation}>
                          <SelectTrigger className="w-full">
                            <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Select Designation" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffDesignations.map((designation) => (
                              <SelectItem key={designation} value={designation}>
                                {designation}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="registerDepartment">Department</Label>
                    <Select value={registerDepartment} onValueChange={setRegisterDepartment}>
                      <SelectTrigger className="w-full">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {(registerRole === 'student' ? studentDepartments : departments).map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerPassword"
                        type="password"
                        placeholder="Password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerConfirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registerConfirmPassword"
                        type="password"
                        placeholder="Confirm Password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="hero" 
                    className="w-full mt-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Create {registerRole === 'student' ? 'Student' : 'Faculty'} Account
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* Switch to Login */}
                <div className="mt-6 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button 
                      onClick={() => setIsRegisterMode(false)}
                      className="text-accent hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
