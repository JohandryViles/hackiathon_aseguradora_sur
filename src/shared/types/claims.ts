export type ExportableClaim = {
	_id?: string;
	claimNumber: string;
	customerId: string;
	providerId?: string;
	locationRegion: string;
	claimAmount: number;
	mlScore: number | null;
	ruleRiskScore: number;
	riskScore: number;
	riskLevel: string;
	anomalyFlags: string[];
	recommendedAction: string;
};

export type ProcessedClaim = {
	_id: string;
	claimNumber: string;
	customerId: string;
	providerId?: string;
	locationRegion: string;
	claimAmount: number;
	mlScore: number | null;
	ruleRiskScore: number;
	riskScore: number;
	riskLevel: "green" | "yellow" | "red";
	anomalyFlags: string[];
	recommendedAction: string;
};

export type RiskFilter = "all" | "green" | "yellow" | "red";
