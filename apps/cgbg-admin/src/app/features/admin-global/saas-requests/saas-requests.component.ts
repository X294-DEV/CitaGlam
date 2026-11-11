import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminService, Package } from '../../../core/services/super-admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EnvironmentService } from '../../../core/services/environment.service';
import { 
  LucideAngularModule, 
  Users, 
  Send, 
  CheckCircle, 
  CreditCard, 
  Calendar,
  Clock,
  MoreVertical,
  ChevronRight,
  Filter,
  Search,
  ExternalLink,
  ImageIcon,
  Eye,
  XCircle,
  RefreshCw,
  Plus,
  Phone,
  Mail,
  MessageCircle,
  Hash
} from 'lucide-angular';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-saas-requests',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './saas-requests.component.html',
  styleUrl: './saas-requests.component.css'
})
export class SaasRequestsComponent implements OnInit {
  private superAdminService = inject(SuperAdminService);
  private notificationService = inject(NotificationService);
  public env = inject(EnvironmentService);

  requests = signal<any[]>([]);
  packages = signal<Package[]>([]);
  isLoading = signal(false);
  
  // Filters
  searchQuery = signal('');
  statusFilter = signal<string>('ALL');

  filteredRequests = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    
    return this.requests().filter(r => {
      const matchesSearch = r.businessName.toLowerCase().includes(query) || 
                           r.fullName.toLowerCase().includes(query);
      const matchesStatus = status === 'ALL' || r.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  ngOnInit() {
    this.refresh();
    this.loadPackages();
  }

  refresh() {
    this.isLoading.set(true);
    this.superAdminService.getBusinessRequests().subscribe({
      next: (data) => {
        this.requests.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Error', 'No se pudieron cargar las solicitudes.');
        this.isLoading.set(false);
      }
    });
  }

  loadPackages() {
    this.superAdminService.getPackages().subscribe({
      next: (pkgs) => this.packages.set(pkgs.filter(p => p.isActive))
    });
  }

  onContactWhatsApp(request: any) {
    const rawPhone = request.phone || '';
    // Clean phone number (leave only digits)
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${request.fullName}, te contacto de CitaGlam sobre tu solicitud de registro para "${request.businessName}". ¿Cómo podemos ayudarte hoy?`);
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(url, '_blank');
  }

  async onSendProposal(request: any) {
    if (this.packages().length === 0) {
      this.notificationService.error('Configuración Requerida', 'No hay paquetes activos para ofrecer.');
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: 'Propuesta de Cierre',
      html: `
        <div style="text-align: left; padding: 10px; font-family: 'Inter', sans-serif;">
          <p style="margin-bottom: 20px; font-size: 0.95rem; color: #4A5568; line-height: 1.5;">
            Personaliza los términos finales para el negocio <span style="background: #EBF4F3; color: #2D4A47; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${request.businessName}</span>.
          </p>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #718096; margin-bottom: 8px; text-transform: uppercase;">PAQUETE SELECCIONADO</label>
            <select id="proposal-package" class="swal2-input" style="width: 100%; height: 48px; margin: 0; padding: 0 12px; border-radius: 12px; border: 1.5px solid #E2E8F0; font-size: 0.95rem;">
              ${this.packages().map(p => `
                <option value="${p.id}" ${p.id === (request.selectedPackageId || this.packages()[0].id) ? 'selected' : ''}>
                  ${p.name} - $${p.price}/mes base
                </option>
              `).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #718096; margin-bottom: 8px; text-transform: uppercase;">PLAZO DE SUSCRIPCIÓN</label>
              <select id="proposal-months" class="swal2-input" style="width: 100%; height: 48px; margin: 0; padding: 0 12px; border-radius: 12px; border: 1.5px solid #E2E8F0; font-size: 0.95rem;">
                <!-- Se poblará dinámicamente -->
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 800; color: #718096; margin-bottom: 8px; text-transform: uppercase;">PRECIO ACORDADO (MXN)</label>
              <input id="proposal-price" type="number" class="swal2-input" placeholder="0.00" style="width: 100%; height: 48px; margin: 0; padding: 0 12px; border-radius: 12px; border: 1.5px solid #E2E8F0; font-size: 1rem; font-weight: 700; color: #2D4A47;">
            </div>
          </div>

          <div style="background: #F7FAFC; padding: 15px; border-radius: 12px; border-left: 4px solid #4A8E8A;">
            <p style="margin: 0; font-size: 0.8rem; color: #4A5568; line-height: 1.4;">
               El precio se pre-carga según el plazo del paquete, pero puedes modificarlo para una oferta especial.
            </p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enviar por Email',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2D4A47',
      didOpen: () => {
        const packageSelect = document.getElementById('proposal-package') as HTMLSelectElement;
        const monthsSelect = document.getElementById('proposal-months') as HTMLSelectElement;
        const priceInput = document.getElementById('proposal-price') as HTMLInputElement;

        const updateTermsAndPrice = () => {
          const selectedPkgId = packageSelect.value;
          const pkg = this.packages().find(p => p.id === selectedPkgId);
          if (!pkg) return;

          // Obtener plazos disponibles (pricesByTerm o default 1 mes)
          const terms = pkg.pricesByTerm ? Object.keys(pkg.pricesByTerm).sort((a,b) => parseInt(a) - parseInt(b)) : ['1'];
          
          // Limpiar y repoblar select de meses
          monthsSelect.innerHTML = terms.map(t => `<option value="${t}">${t} meses</option>`).join('');
          
          // Seleccionar el mes actual del request si coincide, o el primero
          if (request.monthsCount && terms.includes(request.monthsCount.toString())) {
            monthsSelect.value = request.monthsCount.toString();
          }

          // Actualizar precio basado en el plazo
          const selectedMonth = monthsSelect.value;
          const finalPrice = pkg.pricesByTerm ? pkg.pricesByTerm[selectedMonth] : pkg.price;
          priceInput.value = finalPrice.toString();
        };

        const updatePriceOnly = () => {
          const selectedPkgId = packageSelect.value;
          const pkg = this.packages().find(p => p.id === selectedPkgId);
          if (!pkg) return;

          const selectedMonth = monthsSelect.value;
          const finalPrice = pkg.pricesByTerm ? pkg.pricesByTerm[selectedMonth] : pkg.price;
          priceInput.value = finalPrice.toString();
        };

        // Escuchar cambios
        packageSelect.addEventListener('change', updateTermsAndPrice);
        monthsSelect.addEventListener('change', updatePriceOnly);

        // Inicializar
        updateTermsAndPrice();
      },
      preConfirm: () => {
        const packageId = (document.getElementById('proposal-package') as HTMLSelectElement).value;
        const monthsCount = parseInt((document.getElementById('proposal-months') as HTMLSelectElement).value);
        const negotiatedPrice = parseFloat((document.getElementById('proposal-price') as HTMLInputElement).value);

        if (!packageId || isNaN(monthsCount) || isNaN(negotiatedPrice)) {
          Swal.showValidationMessage('Todos los campos son obligatorios.');
          return false;
        }

        return { packageId, monthsCount, negotiatedPrice };
      }
    });

    if (formValues) {
      this.isLoading.set(true);
      this.superAdminService.sendNegotiatedProposal(request.id, formValues).subscribe({
        next: () => {
          this.notificationService.success('Propuesta Enviada', 'Se han enviado las instrucciones de pago al cliente.');
          this.refresh();
        },
        error: (err) => {
          this.notificationService.error('Error', err.error?.message || 'No se pudo enviar la propuesta.');
          this.isLoading.set(false);
        }
      });
    }
  }

  async onApprove(request: any) {
    const confirm = await this.notificationService.confirm(
      `¿Activar Negocio: ${request.businessName}?`,
      `Se creará el Tenant y el usuario administrador con el plan negociado ($${request.negotiatedPrice}).`,
      'Activar Negocio'
    );

    if (confirm) {
      this.isLoading.set(true);
      this.superAdminService.approveBusinessRequest(request.id).subscribe({
        next: () => {
          this.notificationService.success('¡Negocio Activado!', 'El cliente ha recibido sus credenciales de acceso.');
          this.refresh();
        },
        error: (err) => {
          this.notificationService.error('Error', err.error?.message || 'Error al activar el negocio.');
          this.isLoading.set(false);
        }
      });
    }
  }

  onRejectPayment(request: any): void {
    Swal.fire({
      title: 'Rechazar Comprobante',
      text: 'Indique el motivo del rechazo para informar al cliente:',
      input: 'textarea',
      inputPlaceholder: 'Ej: El documento es ilegible o no corresponde al monto...',
      inputAttributes: {
        'aria-label': 'Motivo del rechazo'
      },
      showCancelButton: true,
      confirmButtonText: 'Confirmar Rechazo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      showLoaderOnConfirm: true,
      preConfirm: (reason) => {
        if (!reason || reason.trim().length < 5) {
          Swal.showValidationMessage('Por favor proporcione un motivo válido (mínimo 5 caracteres)');
          return false;
        }
        return this.superAdminService.rejectBusinessRequest(request.id, reason).toPromise();
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Rechazado', 'Se ha notificado al cliente y la solicitud ha regresado a estado de propuesta.', 'info');
        this.refresh();
      }
    });
  }

  onViewHistory(request: any): void {
    this.isLoading.set(true);
    this.superAdminService.getBusinessRequestProofs(request.id).subscribe({
      next: (proofs) => {
        this.isLoading.set(false);
        if (proofs.length === 0) {
          Swal.fire('Sin Historial', 'Aún no se han subido comprobantes para esta solicitud.', 'info');
          return;
        }

        const html = `
          <div style="text-align: left; font-family: 'Inter', sans-serif; max-height: 400px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid #E2E8F0; color: #718096; text-align: left;">
                  <th style="padding: 10px 5px;">Fecha</th>
                  <th style="padding: 10px 5px;">Estado</th>
                  <th style="padding: 10px 5px;">Archivo</th>
                </tr>
              </thead>
              <tbody>
                ${proofs.map((p: any) => `
                  <tr style="border-bottom: 1px solid #F7FAFC;">
                    <td style="padding: 12px 5px; color: #4A5568;">
                      ${new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td style="padding: 12px 5px;">
                      <span style="
                        padding: 3px 8px; 
                        border-radius: 20px; 
                        font-size: 0.75rem; 
                        font-weight: 700;
                        background: ${p.status === 'APPROVED' ? '#EBFDF5' : p.status === 'REJECTED' ? '#FFF5F5' : '#F0F9FF'};
                        color: ${p.status === 'APPROVED' ? '#059669' : p.status === 'REJECTED' ? '#E53E3E' : '#3182CE'};
                      ">
                        ${p.status === 'APPROVED' ? 'Aprobado' : p.status === 'REJECTED' ? 'Rechazado' : 'Esperando'}
                      </span>
                      ${p.adminNotes ? `<p style="margin: 4px 0 0; font-size: 0.7rem; color: #E53E3E; font-style: italic;">Motivo: ${p.adminNotes}</p>` : ''}
                    </td>
                    <td style="padding: 12px 5px; text-align: center;">
                      <a href="${this.env.formatUrl(p.evidenceUrl)}" target="_blank" style="color: #4CAF50; text-decoration: none;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #E8F5E9;">
                          👁️
                        </span>
                      </a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        Swal.fire({
          title: `Historial: ${request.businessName}`,
          html: html,
          width: '600px',
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#2D4A47',
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.error('Error', 'No se pudo cargar el historial.');
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Nuevo Lead',
      'PROPOSAL_SENT': 'Propuesta Enviada',
      'WAITING_APPROVAL': 'Pago por Validar',
      'APPROVED': 'Activado',
      'REJECTED': 'Rechazado'
    };
    return labels[status] || status;
  }
}
