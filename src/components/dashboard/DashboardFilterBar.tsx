import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/types/grievance';

const DEPARTMENTS = [
  'COMPUTER SCIENCE AND ENGINEERING',
  'ELECTRONICS AND COMMUNICATION ENGINEERING',
  'ELECTRICAL AND ELECTRONICS ENGINEERING',
  'MECHANICAL ENGINEERING',
  'CIVIL ENGINEERING',
  'BUSINESS ADMINISTRATION',
];

export interface DashboardFilterState {
  search: string;
  department: string;
  category: string;
  priority: string;
  status: string;
  date_from: string;
  date_to: string;
}

export const INITIAL_FILTER_STATE: DashboardFilterState = {
  search: '',
  department: '',
  category: '',
  priority: '',
  status: '',
  date_from: '',
  date_to: '',
};

interface DashboardFilterBarProps {
  onApplyFilters: (filters: DashboardFilterState) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

export function DashboardFilterBar({
  onApplyFilters,
  onResetFilters,
  isLoading,
}: DashboardFilterBarProps) {
  const [filters, setFilters] = useState<DashboardFilterState>(INITIAL_FILTER_STATE);

  const hasActiveFilters = Object.values(filters).some((val) => Boolean(val));

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTER_STATE);
    onResetFilters();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-card mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="h-4 w-4 text-primary" /> Search & Global Filters
        </span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-8 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5 mr-1" /> Reset Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Global Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student, reg no., ticket ID, category…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="pl-10 bg-background/50 border-border"
          />
        </div>

        {/* Department Filter */}
        <Select
          value={filters.department}
          onValueChange={(val) => setFilters((f) => ({ ...f, department: val === 'all' ? '' : val }))}
        >
          <SelectTrigger className="bg-background/50 border-border">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.category}
          onValueChange={(val) => setFilters((f) => ({ ...f, category: val === 'all' ? '' : val }))}
        >
          <SelectTrigger className="bg-background/50 border-border">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={filters.priority}
          onValueChange={(val) => setFilters((f) => ({ ...f, priority: val === 'all' ? '' : val }))}
        >
          <SelectTrigger className="bg-background/50 border-border">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(val) => setFilters((f) => ({ ...f, status: val === 'all' ? '' : val }))}
        >
          <SelectTrigger className="bg-background/50 border-border">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Date From
          </Label>
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            className="bg-background/50 border-border text-xs"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Date To
          </Label>
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            className="bg-background/50 border-border text-xs"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleApply} disabled={isLoading} className="px-6 font-medium">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
