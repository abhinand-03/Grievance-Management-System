import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  MessageSquare,
  BarChart3,
  EyeOff,
  Users,
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Secure & Confidential',
    description: 'All grievances are handled with strict confidentiality and data protection.',
  },
  {
    icon: Clock,
    title: 'Quick Resolution',
    description: '48-hour initial response time with automatic escalation for unresolved issues.',
  },
  {
    icon: EyeOff,
    title: 'Anonymous Reporting',
    description: 'Submit grievances anonymously to protect your identity when needed.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Communication',
    description: 'In-app messaging for clarifications and updates on your grievance.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Tracking',
    description: 'Real-time status updates and complete history of your submissions.',
  },
  {
    icon: Users,
    title: 'Dedicated Team',
    description: 'Experienced grievance cell members committed to fair resolution.',
  },
];

const stats = [
  { value: '98%', label: 'Resolution Rate' },
  { value: '48h', label: 'Avg Response Time' },
  { value: '1,500+', label: 'Cases Resolved' },
  { value: '4.8/5', label: 'Student Rating' },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shadow-md">
                <span className="text-primary-foreground font-bold">G</span>
              </div>
              <span className="text-lg font-semibold font-display">Grievance Portal</span>
            </div>
            <Button onClick={() => navigate('/login')}>
              Sign In
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm mb-6 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Trusted by 10,000+ students</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display mb-6 animate-slide-up">
              Your Voice Matters,{' '}
              <span className="text-accent">We Listen</span>
            </h1>
            <p className="text-lg sm:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              A transparent and efficient platform for students to raise concerns, 
              track progress, and ensure fair resolution of grievances.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button 
                variant="accent" 
                size="xl"
                onClick={() => navigate('/login')}
                className="shadow-lg hover:shadow-xl"
              >
                Submit a Grievance
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button 
                variant="heroOutline" 
                size="xl"
                onClick={() => navigate('/login')}
              >
                Track Your Complaint
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 -mt-12 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-xl border-0">
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold font-display text-primary mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground mb-4">
              Why Use Our Platform?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We've built a system that prioritizes transparency, speed, and privacy 
              to ensure every student concern is addressed fairly.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={i} 
                  className="shadow-card hover:shadow-card-hover transition-all duration-300 group"
                >
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold font-display text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground mb-4">
              Ready to Make Your Voice Heard?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of students who have successfully resolved their concerns 
              through our platform.
            </p>
            <Button 
              variant="hero" 
              size="xl"
              onClick={() => navigate('/login')}
            >
              Get Started Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">G</span>
              </div>
              <span className="text-sm font-medium">Grievance Portal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 University Grievance Cell. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
