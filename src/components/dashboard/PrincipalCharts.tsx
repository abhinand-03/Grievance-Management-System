import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { CATEGORY_LABELS, STATUS_LABELS, GrievanceCategory, GrievanceStatus } from '@/types/grievance';
import { BarChart3, PieChart as PieChartIcon, Building2, Tag } from 'lucide-react';

interface PrincipalChartsProps {
  monthlyStats: { month: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  departmentStats: { department: string; count: number }[];
  categoryStats: { category: string; count: number }[];
}

const COLOR_PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#64748B'];

export function PrincipalCharts({
  monthlyStats,
  statusDistribution,
  departmentStats,
  categoryStats,
}: PrincipalChartsProps) {
  // Format Category Data
  const categoryData = categoryStats.map((item) => ({
    name: CATEGORY_LABELS[item.category as GrievanceCategory] || item.category,
    value: item.count,
  }));

  // Format Status Data
  const statusData = statusDistribution.map((item) => ({
    name: STATUS_LABELS[item.status as GrievanceStatus] || item.status,
    value: item.count,
  }));

  // Format Department Data
  const deptData = departmentStats.map((item) => ({
    name: item.department.length > 18 ? item.department.substring(0, 18) + '…' : item.department,
    fullDepartment: item.department,
    count: item.count,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* 1. Monthly Grievances Bar Chart */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold font-display flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Monthly Grievances Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {monthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="count" name="Grievances" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No monthly data recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Status Distribution Pie Chart */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold font-display flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-emerald-500" /> Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No status distribution data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Department Wise Complaints (Horizontal Bar Chart) */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold font-display flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-400" /> Top Departments with Complaints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={110} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="count" name="Complaints" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No department data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Category Distribution Donut Chart */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold font-display flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-500" /> Category Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cat-cell-${index}`} fill={COLOR_PALETTE[(index + 2) % COLOR_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No category distribution data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
