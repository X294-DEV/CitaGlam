import { Component, OnInit, signal, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, UserPlus, MoreVertical, ExternalLink, Calendar, DollarSign, MessageCircle } from 'lucide-angular';
import { ClientService, Client } from '../../../core/services/client.service';
import { ClientModalComponent } from '../client-modal/client-modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ClientModalComponent],
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.css'
})
export class ClientsListComponent implements OnInit {
  private clientService = inject(ClientService);
  private router = inject(Router);

  @ViewChild('clientModal') clientModal!: ClientModalComponent;

  clients = signal<Client[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);

  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.clients();
    return this.clients().filter(c => 
      c.firstName.toLowerCase().includes(term) || 
      c.lastName.toLowerCase().includes(term) || 
      c.email.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients() {
    this.isLoading.set(true);
    this.clientService.getClients().subscribe({
      next: (data) => {
        this.clients.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  viewClient(id: string) {
    this.router.navigate(['/admin/clients', id]);
  }

  openManualCreate() {
    this.clientModal.open();
  }

  getWhatsAppLink(phone: string) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}`;
  }
}
