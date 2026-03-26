import { DashboardLayout } from '@/components/DashboardLayout';
import { GrievanceForm } from '@/components/GrievanceForm';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, FileEdit } from 'lucide-react';

export default function NewGrievance() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New Grievance</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <FileEdit className="h-5 w-5 text-accent" />
            </div>
            Submit New Grievance
          </h1>
          <p className="text-muted-foreground mt-2">
            Fill out the form below to submit your grievance. All fields marked with * are required.
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Grievance Details</CardTitle>
            <CardDescription>
              Please provide accurate information to help us address your concern quickly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GrievanceForm />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
