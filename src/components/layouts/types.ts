// src/components/layouts/types.ts
import { Location } from 'react-router-dom';

export interface NavItem {
    to: string;
    label: string;
    icon?: React.ElementType;
    permission: null;
    category?: string;
    children?: NavItem[];
}

export interface CollapsibleNavItemProps {
    item: NavItem;
    open: boolean;
    onToggle: () => void;
    location: Location;
}

export const DRAWER_WIDTH = 250;

