import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  GrievanceCategory, 
  CATEGORY_LABELS
} from '@/types/grievance';
import { grievancesApi } from '@/services/api';
import { 
  Upload, 
  X, 
  EyeOff, 
  Send,
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function GrievanceForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: '' as GrievanceCategory | '',
    subject: '',
    description: '',
    isAnonymous: false,
  });
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Call the actual API to create grievance
      await grievancesApi.create({
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        isAnonymous: formData.isAnonymous,
      });
      
      toast.success('Grievance submitted successfully!', {
        description: 'You will receive a confirmation email shortly.',
      });
      
      navigate('/grievances');
    } catch (error: any) {
      toast.error('Failed to submit grievance', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });
    setFiles(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={formData.category}
          onValueChange={(value: GrievanceCategory) => 
            setFormData(prev => ({ ...prev, category: value }))
          }
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CATEGORY_LABELS) as GrievanceCategory[]).map((category) => (
              <SelectItem key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          placeholder="Brief summary of your grievance"
          value={formData.subject}
          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground text-right">
          {formData.subject.length}/100
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Detailed Description *</Label>
        <Textarea
          id="description"
          placeholder="Please provide a detailed description of your grievance, including any relevant dates, locations, and persons involved..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={6}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {formData.description.length}/2000
        </p>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label>Attachments (Optional)</Label>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or <span className="text-accent font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max 5 files, up to 5MB each (images, PDFs)
            </p>
          </label>
        </div>
        
        {files.length > 0 && (
          <div className="space-y-2 mt-4">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anonymous Toggle */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-100">
              <EyeOff className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Submit Anonymously</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Your identity will be hidden from staff members. Only super admins can view your details.
                  </p>
                </div>
                <Switch
                  checked={formData.isAnonymous}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isAnonymous: checked }))
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Important:</p>
          <p className="mt-1">
            All grievances are reviewed within 48 hours. You will receive email updates on the status of your complaint.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4 pt-4">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => navigate('/dashboard')}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="accent"
          disabled={isSubmitting}
          className="min-w-[140px]"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Submit Grievance
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
