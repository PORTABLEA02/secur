import { Observable, ObservableArray } from '@nativescript/core';
import { SecurouteService } from './services/securoute.service';
import { VehicleInfo, ContraventionInfo } from './models/vehicle.model';

export class MainViewModel extends Observable {
  private securouteService: SecurouteService;
  
  private _plateNumber: string = '';
  private _chassisNumber: string = '';
  private _isLoading: boolean = false;
  private _vehicleInfo: ObservableArray<VehicleInfo>;
  private _contraventions: ObservableArray<ContraventionInfo>;
  private _errorMessage: string = '';
  private _hasData: boolean = false;

  constructor() {
    super();
    this.securouteService = new SecurouteService();
    this._vehicleInfo = new ObservableArray<VehicleInfo>();
    this._contraventions = new ObservableArray<ContraventionInfo>();
  }

  get plateNumber(): string {
    return this._plateNumber;
  }

  set plateNumber(value: string) {
    if (this._plateNumber !== value) {
      this._plateNumber = value;
      this.notifyPropertyChange('plateNumber', value);
    }
  }

  get chassisNumber(): string {
    return this._chassisNumber;
  }

  set chassisNumber(value: string) {
    if (this._chassisNumber !== value) {
      this._chassisNumber = value;
      this.notifyPropertyChange('chassisNumber', value);
    }
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  set isLoading(value: boolean) {
    if (this._isLoading !== value) {
      this._isLoading = value;
      this.notifyPropertyChange('isLoading', value);
    }
  }

  get vehicleInfo(): ObservableArray<VehicleInfo> {
    return this._vehicleInfo;
  }

  get contraventions(): ObservableArray<ContraventionInfo> {
    return this._contraventions;
  }

  get errorMessage(): string {
    return this._errorMessage;
  }

  set errorMessage(value: string) {
    if (this._errorMessage !== value) {
      this._errorMessage = value;
      this.notifyPropertyChange('errorMessage', value);
    }
  }

  get hasData(): boolean {
    return this._hasData;
  }

  set hasData(value: boolean) {
    if (this._hasData !== value) {
      this._hasData = value;
      this.notifyPropertyChange('hasData', value);
    }
  }

  get canSearch(): boolean {
    return this._plateNumber.trim() !== '' && 
           this._chassisNumber.trim() !== '' && 
           !this._isLoading;
  }

  async onSearch() {
    if (!this.canSearch) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.hasData = false;

    try {
      const result = await this.securouteService.getVehicleInfo(
        this._plateNumber.trim(),
        this._chassisNumber.trim()
      );

      this._vehicleInfo.splice(0);
      this._contraventions.splice(0);

      if (result.vehicleInfo.length > 0) {
        result.vehicleInfo.forEach(info => this._vehicleInfo.push(info));
      }

      if (result.contraventions.length > 0) {
        result.contraventions.forEach(contrav => this._contraventions.push(contrav));
      }

      this.hasData = result.vehicleInfo.length > 0 || result.contraventions.length > 0;
      
      if (!this.hasData) {
        this.errorMessage = 'Aucune information trouvée pour ce véhicule';
      }

    } catch (error) {
      this.errorMessage = error.message;
      console.error('Erreur lors de la recherche:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onClear() {
    this.plateNumber = '';
    this.chassisNumber = '';
    this.errorMessage = '';
    this.hasData = false;
    this._vehicleInfo.splice(0);
    this._contraventions.splice(0);
  }
}