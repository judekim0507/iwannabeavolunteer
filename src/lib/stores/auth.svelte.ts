import { supabase, type CouncilAdmin, type Council } from '$lib/supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

// Persisted auth state with robust session management
class AuthStore {
	user = $state<User | null>(null);
	session = $state<Session | null>(null);
	adminRole = $state<CouncilAdmin | null>(null);
	userCouncil = $state<Council | null>(null);

	isLoading = $state(true);
	isInitialized = $state(false);
	error = $state<string | null>(null);

	private unsubscribe: (() => void) | null = null;
	private refreshTimer: ReturnType<typeof setTimeout> | null = null;
	private lastUserId: string | null = null;

	get isAuthenticated() {
		return !!this.user && !!this.adminRole;
	}

	get isSuperuser() {
		return this.adminRole?.role === 'superuser';
	}

	async initialize() {
		if (this.isInitialized) return;

		try {
			// Get initial session
			const { data: { session }, error: sessionError } = await supabase.auth.getSession();

			if (sessionError) {
				console.error('Session error:', sessionError);
				this.error = sessionError.message;
				return;
			}

			if (session?.user) {
				this.session = session;
				this.user = session.user;
				this.lastUserId = session.user.id;
				await this.loadAdminRole();
				this.scheduleTokenRefresh(session);
			}

			// Set up auth state listener
			const { data: { subscription } } = supabase.auth.onAuthStateChange(
				async (event: AuthChangeEvent, session: Session | null) => {
					await this.handleAuthChange(event, session);
				}
			);

			this.unsubscribe = () => subscription.unsubscribe();
		} catch (err) {
			console.error('Auth initialization error:', err);
			this.error = err instanceof Error ? err.message : 'Failed to initialize auth';
		} finally {
			this.isLoading = false;
			this.isInitialized = true;
		}
	}

	private async handleAuthChange(event: AuthChangeEvent, session: Session | null) {
		// Clear any existing refresh timer
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}

		switch (event) {
			case 'SIGNED_IN':
				// Only reinitialize if it's a different user (not just a token refresh)
				if (session?.user && session.user.id !== this.lastUserId) {
					this.session = session;
					this.user = session.user;
					this.lastUserId = session.user.id;
					this.isLoading = true;
					await this.loadAdminRole();
					this.isLoading = false;
				} else if (session) {
					// Just update session for same user
					this.session = session;
				}
				if (session) {
					this.scheduleTokenRefresh(session);
				}
				break;

			case 'TOKEN_REFRESHED':
				if (session) {
					this.session = session;
					this.user = session.user;
					this.scheduleTokenRefresh(session);
				}
				break;

			case 'SIGNED_OUT':
				this.clearState();
				break;

			case 'USER_UPDATED':
				if (session?.user) {
					this.user = session.user;
					this.session = session;
				}
				break;
		}
	}

	private scheduleTokenRefresh(session: Session) {
		// Clear existing timer
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}

		// Calculate when to refresh (5 minutes before expiry)
		const expiresAt = session.expires_at;
		if (!expiresAt) return;

		const expiresIn = expiresAt * 1000 - Date.now();
		const refreshIn = Math.max(0, expiresIn - 5 * 60 * 1000); // 5 min before expiry

		this.refreshTimer = setTimeout(async () => {
			try {
				const { error } = await supabase.auth.refreshSession();
				if (error) {
					console.error('Token refresh failed:', error);
					// If refresh fails, sign out
					await this.signOut();
				}
			} catch (err) {
				console.error('Token refresh error:', err);
			}
		}, refreshIn);
	}

	private async loadAdminRole() {
		if (!this.user) return;

		this.error = null;

		try {
			const { data, error: err } = await supabase
				.from('council_admins')
				.select('*')
				.eq('user_id', this.user.id)
				.single();

			if (err) {
				if (err.code === 'PGRST116') {
					// Not an admin
					this.error = `Access denied: ${this.user.email} is not registered as an admin.`;
					// Wait briefly to show error, then sign out
					setTimeout(() => this.signOut(), 2500);
					return;
				}
				throw err;
			}

			this.adminRole = data;

			// Load associated council if not superuser
			if (data.council_id) {
				const { data: councilData } = await supabase
					.from('councils')
					.select('*')
					.eq('id', data.council_id)
					.single();

				this.userCouncil = councilData ?? null;
			}
		} catch (err) {
			console.error('Load admin role error:', err);
			this.error = err instanceof Error ? err.message : 'Failed to verify admin access';
		}
	}

	async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
		this.isLoading = true;
		this.error = null;

		try {
			const { error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password,
			});

			if (error) {
				this.error = error.message;
				return { success: false, error: error.message };
			}

			return { success: true };
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Sign in failed';
			this.error = message;
			return { success: false, error: message };
		} finally {
			this.isLoading = false;
		}
	}

	async signOut() {
		try {
			await supabase.auth.signOut();
		} catch (err) {
			console.error('Sign out error:', err);
		}
		this.clearState();
	}

	private clearState() {
		this.user = null;
		this.session = null;
		this.adminRole = null;
		this.userCouncil = null;
		this.lastUserId = null;
		this.error = null;

		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	destroy() {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}
}

// Singleton instance
export const auth = new AuthStore();
