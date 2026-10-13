import React from 'react';
import { Users, Building2 } from 'lucide-react';

interface AdminOverviewTabProps {
  userCount: number;
  clientCount: number;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  userCount,
  clientCount
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
          <Users size={24}/>
        </div>
        <div>
          <p className="text-sm text-gray-500">Tổng nhân sự</p>
          <p className="text-2xl font-bold text-gray-800">{userCount}</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
          <Building2 size={24}/>
        </div>
        <div>
          <p className="text-sm text-gray-500">Khách hàng</p>
          <p className="text-2xl font-bold text-gray-800">{clientCount}</p>
        </div>
      </div>
    </div>
  );
};
