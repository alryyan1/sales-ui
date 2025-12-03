// src/components/layouts/types.ts
import { PermissionName } from '@/hooks/useAuthorization';
import { Location } from 'react-router-dom';

export interface NavItem {
    to: string;
    label: string;
    icon?: React.ElementType;
    permission: PermissionName | null;
    children?: NavItem[];
}

export interface CollapsibleNavItemProps {
    item: NavItem;
    open: boolean;
    onToggle: () => void;
    can: (permission: PermissionName) => boolean;
    location: Location;
}

export const DRAWER_WIDTH = 250;

