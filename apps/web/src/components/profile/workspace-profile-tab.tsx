'use client';

import { useState, useEffect } from 'react';
import { Building2, User, Loader2 } from 'lucide-react';
import { useCurrentMember } from '@/hooks/use-current-member';
import { useI18n } from '@/providers/i18n-provider';
import { ROLE_LABELS, ROLE_COLORS } from '@/types';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';

interface Department {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  roleId: string;
  roleCode: string;
  roleName: string;
}

interface WorkspaceProfileTabProps {
  workspaceId: string;
  workspaceName: string;
  workspaceType: 'PERSONAL' | 'COMPANY';
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-900">
        {value || <span className="text-gray-400 italic">{t('profile.workspace.notSet')}</span>}
      </span>
    </div>
  );
}

const EMPLOYMENT_STATUS_COLOR: Record<string, string> = {
  PROBATION: 'bg-yellow-100 text-yellow-700',
  WORKING: 'bg-green-100 text-green-700',
  ON_LEAVE: 'bg-[#CFAF6E]/15 text-[#0B1F3A]',
  RESIGNED: 'bg-gray-100 text-gray-600',
  RETIRED: 'bg-purple-100 text-purple-700',
  FIRED: 'bg-red-100 text-red-700',
};

export function WorkspaceProfileTab({
  workspaceId,
  workspaceName,
  workspaceType,
}: WorkspaceProfileTabProps) {
  const { t } = useI18n();
  const { member, isLoading } = useCurrentMember(workspaceId);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(false);
  const [hdldOptions, setHdldOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    if (!member?.id) {
      setDepartments([]);
      return;
    }
    let cancelled = false;
    setDeptsLoading(true);

    // Fetch departments and catalog in parallel
    Promise.all([
      apiClient.get(`/workspaces/${workspaceId}/members/${member.id}/departments`),
      apiClient.get(`/workspaces/${workspaceId}/catalogs?type=HDLD_TYPE`),
    ])
      .then(([deptsRes, hdldRes]) => {
        if (cancelled) return;

        setDepartments((deptsRes.data as { data?: Department[] }).data ?? []);
        setDeptsLoading(false);

        // Parse catalog values
        const catalogs = Array.isArray((hdldRes.data as { data?: unknown[] }).data)
          ? ((hdldRes.data as { data: unknown[] }).data)
          : [];
        const catalog = catalogs.find(
          (c: unknown) => (c as Record<string, unknown>).code === 'HDLD_TYPE',
        );
        if (catalog && Array.isArray((catalog as Record<string, unknown>).values)) {
          setHdldOptions(
            (catalog as { values: Array<{ value: string; label: string }> }).values.map((v) => ({
              value: v.value,
              label: v.label,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDepartments([]);
          setDeptsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, member?.id]);

  const genderLabel: Record<string, string> = {
    MALE: t('memberEdit.gender.male'),
    FEMALE: t('memberEdit.gender.female'),
    OTHER: t('memberEdit.gender.other'),
  };

  const employmentStatusLabel: Record<string, string> = {
    PROBATION: t('members.employmentStatus.PROBATION'),
    WORKING: t('members.employmentStatus.WORKING'),
    ON_LEAVE: t('members.employmentStatus.ON_LEAVE'),
    RESIGNED: t('members.employmentStatus.RESIGNED'),
    RETIRED: t('members.employmentStatus.RETIRED'),
    FIRED: t('members.employmentStatus.FIRED'),
  };

  if (isLoading) {
    return (
      <div className="glass-content-card rounded-xl p-10 flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#CFAF6E]" />
        <span className="text-sm text-gray-500">{t('profile.workspace.loading')}</span>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="glass-content-card rounded-xl p-10 text-center">
        <p className="text-sm text-gray-400">{t('profile.workspace.noMemberData')}</p>
      </div>
    );
  }

  const displayName = member.displayName || member.user.fullName || '---';
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel = ROLE_LABELS[member.role.code] ?? member.role.name;
  const roleColor = ROLE_COLORS[member.role.code] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[0.8rem]">
      {/* ─── Left column ─── */}
      <div className="space-y-[0.8rem]">
        {/* Identity card */}
        <div className="glass-content-card rounded-xl p-6 space-y-4">
          {/* Section header */}
          <h3 className="text-sm font-semibold text-[#0B1F3A] flex items-center gap-2 pb-3 border-b border-gray-100">
            {workspaceType === 'COMPANY' ? (
              <Building2 className="h-4 w-4 text-[#CFAF6E]" />
            ) : (
              <User className="h-4 w-4 text-[#CFAF6E]" />
            )}
            {t('profile.workspace.section.identity')}
            <span className="ml-auto text-xs text-gray-400 font-normal">{workspaceName}</span>
          </h3>

          {/* Avatar + name + role */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[#CFAF6E]/15 text-[#0B1F3A] rounded-full flex items-center justify-center text-lg font-semibold overflow-hidden flex-shrink-0">
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900 truncate">{displayName}</p>
              {member.employeeCode && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('profile.workspace.employeeCode')}:{' '}
                  <span className="font-medium text-[#0B1F3A]">{member.employeeCode}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', roleColor)}>
                  {roleLabel}
                </span>
                {member.employmentStatus && (
                  <span
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium',
                      EMPLOYMENT_STATUS_COLOR[member.employmentStatus] ?? 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {employmentStatusLabel[member.employmentStatus] ?? member.employmentStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact fields */}
          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-gray-100">
            <InfoRow
              label={t('profile.workspace.workspaceEmail')}
              value={member.workspaceEmail || member.user.email}
            />
            <InfoRow
              label={t('profile.workspace.workspacePhone')}
              value={member.workspacePhone || member.user.phone}
            />
            {member.displayName && (
              <InfoRow label={t('profile.workspace.displayName')} value={member.displayName} />
            )}
          </div>
        </div>

        {/* Employment card */}
        <div className="glass-content-card rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#0B1F3A] pb-3 border-b border-gray-100">
            {t('profile.workspace.section.employment')}
          </h3>

          <InfoRow
            label={t('profile.workspace.contractType')}
            value={
              member.contractType
                ? (hdldOptions.find((o) => o.value === member.contractType)?.label ?? member.contractType)
                : null
            }
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('profile.workspace.employmentStatus')}
            </span>
            {member.employmentStatus ? (
              <span
                className={cn(
                  'inline-block text-xs px-2.5 py-1 rounded-full font-medium w-fit',
                  EMPLOYMENT_STATUS_COLOR[member.employmentStatus] ?? 'bg-gray-100 text-gray-600',
                )}
              >
                {employmentStatusLabel[member.employmentStatus] ?? member.employmentStatus}
              </span>
            ) : (
              <span className="text-sm text-gray-400 italic">{t('profile.workspace.notSet')}</span>
            )}
          </div>

          <InfoRow
            label={t('profile.workspace.joinedAt')}
            value={new Date(member.joinedAt).toLocaleDateString('vi-VN')}
          />
        </div>
      </div>

      {/* ─── Right column ─── */}
      <div className="space-y-[0.8rem]">
        {/* Personal info in workspace */}
        <div className="glass-content-card rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#0B1F3A] pb-3 border-b border-gray-100">
            {t('profile.workspace.section.personalInfo')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              label={t('profile.workspace.gender')}
              value={member.gender ? (genderLabel[member.gender] ?? member.gender) : null}
            />
            <InfoRow
              label={t('profile.workspace.dob')}
              value={
                member.dateOfBirth
                  ? new Date(member.dateOfBirth).toLocaleDateString('vi-VN')
                  : null
              }
            />
          </div>
          <InfoRow label={t('profile.workspace.city')} value={member.workspaceCity} />
          <InfoRow label={t('profile.workspace.ward')} value={member.workspaceAddress} />
          <InfoRow label={t('profile.workspace.address')} value={member.addressLine} />
        </div>

        {/* Departments */}
        <div className="glass-content-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#0B1F3A] pb-3 border-b border-gray-100 mb-4">
            {t('profile.workspace.section.departments')}
          </h3>
          {deptsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          ) : departments.length === 0 ? (
            <p className="text-sm text-gray-400">{t('profile.workspace.noDepartments')}</p>
          ) : (
            <div className="space-y-2">
              {departments.map((dept) => (
                <div
                  key={dept.departmentId}
                  className="flex items-center justify-between p-3 bg-[#F5F7FA] rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dept.departmentName}</p>
                    <p className="text-xs text-gray-400">{dept.departmentCode}</p>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium',
                      ROLE_COLORS[dept.roleCode] ?? 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {dept.roleName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
