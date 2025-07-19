import { Http } from '@nativescript/core';
import { VehicleInfo, ContraventionInfo, VehicleResponse } from '../models/vehicle.model';

export class SecurouteService {
  private baseUrl = 'https://securoute.anatt.bj';
  private actionUrl = 'https://securoute.anatt.bj/informations-du-vehicule';

  async getToken(): Promise<string> {
    try {
      console.log('🔍 Récupération du token CSRF...');
      
      const response = await Http.request({
        url: this.baseUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = response.content.toString();
      
      // Recherche du formulaire spécifique
      const formMatch = html.match(/<form[^>]*action="https:\/\/securoute\.anatt\.bj\/informations-du-vehicule"[^>]*>([\s\S]*?)<\/form>/);
      
      if (!formMatch) {
        throw new Error("Formulaire cible non trouvé");
      }
      
      const formContent = formMatch[1];
      const tokenMatch = formContent.match(/name="_token"\s+value="([^"]+)"/);
      
      if (!tokenMatch) {
        throw new Error("Token _token non trouvé dans le formulaire");
      }
      
      const token = tokenMatch[1];
      console.log('✅ Token CSRF récupéré:', token.substring(0, 10) + '...');
      return token;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du token:', error);
      throw new Error(`Erreur lors de la récupération du token: ${error.message}`);
    }
  }

  async getVehicleInfo(plateNumber: string, chassisNumber: string): Promise<VehicleResponse> {
    try {
      console.log('🚗 Recherche des informations pour:', plateNumber, chassisNumber);
      
      const token = await this.getToken();
      
      // Utilisation de GET avec params
      const params = new URLSearchParams();
      params.append('_token', token);
      params.append('vehicle_plate_number', plateNumber);
      params.append('chassis_number', chassisNumber);
      
      console.log('📤 Envoi de la requête GET avec paramètres...');
      
      const response = await Http.request({
        url: `${this.actionUrl}?${params.toString()}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Referer': this.baseUrl
        }
      });

      if (response.statusCode !== 200) {
        throw new Error(`Erreur HTTP ${response.statusCode}`);
      }

      const html = response.content.toString();
      console.log('📥 Réponse reçue, taille:', html.length, 'caractères');
      
      // LOG COMPLET DU CONTENU HTML REÇU
      console.log('🌐 ===== CONTENU HTML COMPLET REÇU =====');
      console.log(html);
      console.log('🌐 ===== FIN DU CONTENU HTML =====');
      
      // Vérification de la présence des éléments clés
      console.log('🔍 Vérifications dans le HTML:');
      console.log('  - Contient "card-info-vehiclue":', html.includes('card-info-vehiclue'));
      console.log('  - Contient "table-detail-seting":', html.includes('table-detail-seting'));
      console.log('  - Contient "title-label":', html.includes('title-label'));
      
      return this.parseVehicleData(html);
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données:', error);
      throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
    }
  }

  private parseVehicleData(html: string): VehicleResponse {
    const vehicleInfo = this.extractVehicleInfo(html);
    const contraventions = this.extractContraventionInfo(html);
    
    console.log('📊 Données extraites:');
    console.log('  - Infos véhicule:', vehicleInfo.length, 'éléments');
    console.log('  - Contraventions:', contraventions.rows.length, 'éléments');
    
    return {
      vehicleInfo,
      contraventions: contraventions.rows,
      contraventionHeaders: contraventions.headers || []
    };
  }

 private extractVehicleInfo(html: string): VehicleInfo[] {
  const vehicleFields = [
    "Immatriculation",
    "N° de châssis", 
    "Marque et modèle",
    "Couleur de plaque",
    "Statut TVM",
    "Échéance Contrôle technique",
    "Dernier Contrôle technique",
    "Échéance Assurance automobile"
  ];

  const results: VehicleInfo[] = [];

  // Récupérer toutes les sections contenant les infos véhicule
  const sectionRegex = /<div[^>]*class="[^"]*section-info-vehicule[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  const matches = html.matchAll(sectionRegex);

  for (const match of matches) {
    const section = match[1];

    const labelMatch = section.match(/<label[^>]*class="title-label"[^>]*>(.*?)<\/label>/);
    const valueMatch = section.match(/<p[^>]*>([\s\S]*?)<\/p>/);

    if (labelMatch && valueMatch) {
      const field = labelMatch[1].trim().replace(/\s+/g, ' ');
      const rawValue = valueMatch[1]
        .replace(/<[^>]+>/g, '')     // Supprime les balises HTML
        .replace(/\s+/g, ' ')        // Normalise les espaces
        .trim();

      if (vehicleFields.includes(field)) {
        results.push({ field, value: rawValue });
      }
    }
  }

  console.log('📊 Résumé des infos véhicule extraites:', results);
  return results;
}

  private extractContraventionInfo(html: string): { headers: string[], rows: ContraventionInfo[] } {
    console.log('🔍 Extraction des informations de contraventions...');
    
    // Recherche de la section contraventions
    const contravMatch = html.match(/<div[^>]*class="[^"]*table-detail-seting[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    
    if (!contravMatch) {
      console.log("❌ Section des contraventions non trouvée.");
      return { headers: [], rows: [] };
    }

    console.log('✅ Section contraventions trouvée');
    const contravContent = contravMatch[1];
    
    // LOG du contenu HTML brut pour debugging
    console.log("🧾 Contenu HTML brut des contraventions (premiers 500 caractères):\n", contravContent.substring(0, 500));
    
    // Recherche du tableau
    const tableMatch = contravContent.match(/<table[^>]*>([\s\S]*?)<\/table>/);
    
    if (!tableMatch) {
      console.log("❌ Tableau des contraventions non trouvé.");
      return { headers: [], rows: [] };
    }

    console.log('✅ Tableau trouvé');
    const tableContent = tableMatch[1];
    const headers: string[] = [];
    const rows: ContraventionInfo[] = [];

    // Extraction des en-têtes
    const theadMatch = tableContent.match(/<thead[^>]*>([\s\S]*?)<\/thead>/);
    if (theadMatch) {
      const theadContent = theadMatch[1];
      const thMatches = theadContent.match(/<th[^>]*>([\s\S]*?)<\/th>/g);
      
      if (thMatches) {
        thMatches.forEach(th => {
          const text = th.replace(/<[^>]*>/g, '').trim();
          if (text) {
            headers.push(text);
            console.log(`📋 En-tête: "${text}"`);
          }
        });
      }
    }

    // Extraction des lignes du corps du tableau
    const tbodyMatch = tableContent.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    if (tbodyMatch) {
      const tbodyContent = tbodyMatch[1];
      const trMatches = tbodyContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
      
      if (trMatches) {
        console.log(`📋 ${trMatches.length} ligne(s) trouvée(s)`);
        
        trMatches.forEach((tr, index) => {
          console.log(`📋 Traitement ligne ${index + 1}:`, tr.substring(0, 200));
          
          const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
          
          if (tdMatches) {
            // Cas spécial: message "Aucune contraventions impayées"
            if (tdMatches.length === 1 && tdMatches[0].includes('Aucune contraventions impayées')) {
              console.log('✅ Message "Aucune contraventions impayées" détecté');
              rows.push({
                numero: 'Aucune contravention',
                infraction: '',
                date: '',
                montant: '',
                statut: ''
              });
            } else {
              // Extraction des données normales (jusqu'à 6 colonnes selon les en-têtes)
              const rowData = tdMatches.map(td => 
                td.replace(/<[^>]*>/g, '').trim()
              );
              
              console.log(`📋 Données ligne ${index + 1}:`, rowData);
              
              rows.push({
                numero: rowData[0] || '',
                infraction: rowData[1] || '',
                date: rowData[2] || '',
                montant: rowData[3] || '',
                statut: rowData[4] || '',
                action: rowData[5] || ''
              });
            }
          }
        });
      }
    }

    console.log('📊 RÉSUMÉ CONTRAVENTIONS:');
    console.log('  - En-têtes:', headers);
    console.log('  - Nombre de lignes:', rows.length);
    
    // Log détaillé de chaque contravention
    rows.forEach((row, index) => {
      console.log(`📋 Contravention ${index + 1}:`, JSON.stringify(row, null, 2));
    });

    return { 
      headers: headers.slice(0, 6), // Garde jusqu'à 6 en-têtes
      rows 
    };
  }
}