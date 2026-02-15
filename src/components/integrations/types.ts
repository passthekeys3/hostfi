export type ConnectionStatus = "connected" | "disconnected" | "error" | "coming_soon";

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ConnectionStatus;
  logo: string;
  logoColor: string;
  logoUrl?: string;
  tier: "free" | "pro" | "business";
  lastSync?: string;
  details?: string;
}

export interface ModalProps {
  onClose: () => void;
}

export interface GoogleSheetsModalProps extends ModalProps {
  isConnected?: boolean;
  onDisconnect?: () => void;
}

export interface GoogleDriveModalProps extends ModalProps {
  isConnected?: boolean;
  onDisconnect?: () => void;
}
