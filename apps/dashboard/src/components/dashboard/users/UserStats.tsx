import { Users, Shield, GraduationCap, Calendar } from 'lucide-react';
import type { UserRecord } from './types';

interface UserStatsProps {
  users: UserRecord[];
}

export function UserStats({ users }: UserStatsProps) {
  const total = users.length;
  const admins = users.filter((u) => u.role === 'admin').length;
  const students = users.filter((u) => u.role === 'student').length;
  const enrolled = users.filter((u) => !!u.termId).length;

  const stats = [
    {
      label: 'Total Users',
      value: total,
      icon: Users,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
    },
    {
      label: 'Administrators',
      value: admins,
      icon: Shield,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      label: 'Students',
      value: students,
      icon: GraduationCap,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      label: 'Assigned Terms',
      value: enrolled,
      icon: Calendar,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-lg border ${stat.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
