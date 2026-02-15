import { supabase, type Event, type Council, type Volunteer, type CouncilAdmin } from '$lib/supabase';
import { auth } from './auth.svelte';

class DashboardStore {
	councils = $state<Council[]>([]);
	events = $state<Event[]>([]);
	volunteers = $state<Volunteer[]>([]);
	admins = $state<(CouncilAdmin & { email?: string })[]>([]);

	isLoading = $state(false);
	hasLoaded = $state(false);
	error = $state<string | null>(null);
	successMessage = $state<string | null>(null);

	councilFilter = $state<string | null>(null);

	get filteredEvents() {
		if (!this.councilFilter) return this.events;
		return this.events.filter((e) => e.council_id === this.councilFilter);
	}

	get activeEventsCount() {
		return this.filteredEvents.filter((e) => e.is_active).length;
	}

	get stats() {
		const filtered = this.filteredEvents;
		return {
			activeEvents: filtered.filter((e) => e.is_active).length,
			totalEvents: filtered.length,
			volunteers: this.volunteers.length,
			councils: this.councils.length,
		};
	}

	async loadAll() {
		if (!auth.isAuthenticated) return;

		this.isLoading = true;
		this.hasLoaded = false;
		this.error = null;

		try {
			await Promise.all([
				this.loadCouncils(),
				this.loadEvents(),
				this.loadVolunteers(),
			]);

			if (auth.isSuperuser) {
				await this.loadAdmins();
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load dashboard data';
		} finally {
			this.isLoading = false;
			this.hasLoaded = true;
		}
	}

	async loadCouncils() {
		const { data, error } = await supabase
			.from('councils')
			.select('*')
			.order('name', { ascending: true });

		if (error) throw error;
		this.councils = data ?? [];
	}

	async loadEvents() {
		let query = supabase
			.from('events')
			.select('*')
			.order('created_at', { ascending: false });

		// Council admins only see their own events
		if (!auth.isSuperuser && auth.userCouncil) {
			query = query.eq('council_id', auth.userCouncil.id);
		}

		const { data, error } = await query;
		if (error) throw error;
		this.events = data ?? [];
	}

	async loadVolunteers() {
		const { data, error } = await supabase
			.from('volunteers')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) throw error;
		this.volunteers = data ?? [];
	}

	async loadAdmins() {
		if (!auth.isSuperuser) return;

		const { data: { session } } = await supabase.auth.getSession();
		if (!session) return;

		const response = await fetch('/api/list-admins', {
			method: 'GET',
			headers: { Authorization: `Bearer ${session.access_token}` },
		});

		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Failed to load admins');

		this.admins = result.admins ?? [];
	}

	getVolunteersForEvent(eventId: string): Volunteer[] {
		return this.volunteers.filter((v) => v.event_id === eventId);
	}

	getCouncilName(councilId: string | null): string {
		if (!councilId) return 'Unassigned';
		return this.councils.find((c) => c.id === councilId)?.name ?? 'Unknown';
	}

	// Event operations
	async createEvent(name: string, emoji: string, endsAt: string | null, councilId: string) {
		const { error } = await supabase.from('events').insert({
			name,
			emoji,
			ends_at: endsAt ? new Date(endsAt).toISOString() : null,
			is_active: false,
			council_id: councilId,
		});

		if (error) throw error;
		await this.loadEvents();
		this.flashSuccess('Event created successfully');
	}

	async updateEvent(id: string, updates: Partial<Pick<Event, 'name' | 'emoji' | 'ends_at'>>) {
		const payload: Record<string, unknown> = {};
		if (updates.name !== undefined) payload.name = updates.name;
		if (updates.emoji !== undefined) payload.emoji = updates.emoji;
		if (updates.ends_at !== undefined) {
			payload.ends_at = updates.ends_at ? new Date(updates.ends_at).toISOString() : null;
		}

		const { error } = await supabase.from('events').update(payload).eq('id', id);
		if (error) throw error;

		await this.loadEvents();
		this.flashSuccess('Event updated');
	}

	async toggleEventActive(eventId: string) {
		const event = this.events.find((e) => e.id === eventId);
		if (!event) return;

		const { error } = await supabase
			.from('events')
			.update({ is_active: !event.is_active })
			.eq('id', eventId);

		if (error) throw error;

		await this.loadEvents();
		this.flashSuccess(event.is_active ? 'Event deactivated' : 'Event activated');
	}

	async deleteEvent(eventId: string) {
		const { error } = await supabase.from('events').delete().eq('id', eventId);
		if (error) throw error;

		await Promise.all([this.loadEvents(), this.loadVolunteers()]);
		this.flashSuccess('Event deleted');
	}

	// Council operations
	async createCouncil(name: string) {
		const { error } = await supabase.from('councils').insert({ name: name.trim() });
		if (error) throw error;

		await this.loadCouncils();
		this.flashSuccess('Council created');
	}

	async deleteCouncil(councilId: string) {
		const { error } = await supabase.from('councils').delete().eq('id', councilId);
		if (error) throw error;

		await Promise.all([this.loadCouncils(), this.loadEvents(), this.loadVolunteers()]);
		if (auth.isSuperuser) await this.loadAdmins();
		this.flashSuccess('Council deleted');
	}

	// Admin operations
	async createAdmin(email: string, password: string, councilId: string) {
		const { data: { session } } = await supabase.auth.getSession();
		if (!session) throw new Error('Not authenticated');

		const response = await fetch('/api/create-admin', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.access_token}`,
			},
			body: JSON.stringify({ email: email.trim(), password, councilId }),
		});

		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Failed to create admin');

		await this.loadAdmins();
		this.flashSuccess('Admin account created');
	}

	async deleteAdmin(adminId: string, userId: string) {
		const { data: { session } } = await supabase.auth.getSession();
		if (!session) throw new Error('Not authenticated');

		const response = await fetch('/api/delete-admin', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.access_token}`,
			},
			body: JSON.stringify({ adminId, userId }),
		});

		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Failed to delete admin');

		await this.loadAdmins();
		this.flashSuccess('Admin account removed');
	}

	// Wheel of Names
	async createWheelForEvent(event: Event): Promise<string | null> {
		const volunteers = this.getVolunteersForEvent(event.id);
		if (volunteers.length === 0) {
			throw new Error('No volunteers to add to the wheel');
		}

		const response = await fetch('/api/wheel', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: `${event.name} — Random Picker`,
				description: `Random selection wheel for ${event.name}`,
				entries: volunteers.map((v) => ({ label: v.full_name })),
			}),
		});

		const data = await response.json();
		if (!response.ok) throw new Error(data?.message || 'Failed to create wheel');

		this.flashSuccess('Random picker wheel created');
		return data?.url ?? null;
	}

	flashSuccess(message: string) {
		this.successMessage = message;
		setTimeout(() => {
			if (this.successMessage === message) {
				this.successMessage = null;
			}
		}, 3000);
	}

	clearMessages() {
		this.error = null;
		this.successMessage = null;
	}

	reset() {
		this.councils = [];
		this.events = [];
		this.volunteers = [];
		this.admins = [];
		this.hasLoaded = false;
		this.councilFilter = null;
		this.clearMessages();
	}
}

export const dashboard = new DashboardStore();
