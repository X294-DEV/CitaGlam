import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClientService, Client } from '../../../core/services/client.service';
import { LucideAngularModule, ArrowLeft, Mail, Phone, Calendar, DollarSign, MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-angular';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.css'
})
export class ClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientService = inject(ClientService);

  client = signal<Client | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadClient(id);
    } else {
      this.router.navigate(['/admin/clients']);
    }
  }

  loadClient(id: string) {
    this.isLoading.set(true);
    this.clientService.getClient(id).subscribe({
      next: (data) => {
        this.client.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/admin/clients']);
      }
    });
  }

  getWhatsAppLink(phone: string) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}`;
  }

  getStatusIcon(status: string) {
    switch (status) {
      case 'COMPLETED': return 'check-circle';
      case 'CONFIRMED': return 'check-circle';
      case 'CANCELLED': return 'x-circle';
      default: return 'clock';
    }
  }
}
