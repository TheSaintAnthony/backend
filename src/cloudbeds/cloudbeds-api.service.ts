import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as qs from 'qs';

@Injectable()
export class CloudBedsApiService implements OnModuleInit {
  private readonly logger = new Logger(CloudBedsApiService.name);
  private readonly httpClient: AxiosInstance;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: Date;
  private readonly isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.CLOUDBEDS_ENABLED === 'true';
    
    if (!this.isEnabled) {
      this.logger.log('CloudBeds integration is disabled');
      // Create a dummy client that won't be used
      this.httpClient = axios.create();
      return;
    }

    const apiUrl = process.env.CLOUDBEDS_API_URL || 'https://hotels.cloudbeds.com/api/v1.2';
    this.accessToken = process.env.CLOUDBEDS_ACCESS_TOKEN;
    this.refreshToken = process.env.CLOUDBEDS_REFRESH_TOKEN;

    this.httpClient = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.setupInterceptors();
  }

  async onModuleInit() {
    if (!this.isEnabled) return;

    // Try to get initial token if not provided
    if (!this.accessToken && process.env.CLOUDBEDS_CLIENT_ID) {
      try {
        await this.getAccessToken();
        this.logger.log('CloudBeds access token obtained successfully');
      } catch (error) {
        this.logger.error('Failed to obtain initial CloudBeds access token', error);
      }
    }
  }

  private setupInterceptors() {
    if (!this.isEnabled) return;

    // Request interceptor
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (this.tokenExpiresAt && this.tokenExpiresAt <= new Date()) {
          await this.refreshAccessToken();
        }

        if (this.accessToken) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            if (error.config) {
              error.config.headers['Authorization'] = `Bearer ${this.accessToken}`;
              return this.httpClient.request(error.config);
            }
          } catch (refreshError) {
            this.logger.error('Failed to refresh CloudBeds token', refreshError);
          }
        }

        this.logger.error(`CloudBeds API Error: ${error.message}`, {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  private async getAccessToken(): Promise<void> {
    if (!this.isEnabled) return;

    const clientId = process.env.CLOUDBEDS_CLIENT_ID;
    const clientSecret = process.env.CLOUDBEDS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('CloudBeds client credentials not configured');
    }

    const formData = qs.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    try {
      const response = await this.httpClient.post('/access_token', formData);
      const data = response.data;

      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    } catch (error) {
      this.logger.error('Failed to get CloudBeds access token', error);
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.isEnabled || !this.refreshToken) {
      await this.getAccessToken();
      return;
    }

    const clientId = process.env.CLOUDBEDS_CLIENT_ID;
    const clientSecret = process.env.CLOUDBEDS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('CloudBeds client credentials not configured');
    }

    const formData = qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    try {
      const response = await this.httpClient.post('/access_token', formData);
      const data = response.data;

      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    } catch (error) {
      this.logger.warn('Token refresh failed, trying client credentials', error);
      await this.getAccessToken();
    }
  }

  /**
   * Get hotel details
   * GET /getHotelDetails?propertyID={propertyID}
   */
  async getHotelDetails(propertyID?: string): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const params = propertyID ? { propertyID } : {};
      const response = await this.httpClient.get('/getHotelDetails', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get hotel details', error);
      throw error;
    }
  }

  /**
   * Get room types
   * GET /getRoomTypes
   */
  async getRoomTypes(params?: {
    propertyIDs?: string;
    roomTypeIDs?: string;
    startDate?: string;
    endDate?: string;
    adults?: number;
    children?: number;
    detailedRates?: boolean;
  }): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const response = await this.httpClient.get('/getRoomTypes', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get room types', error);
      throw error;
    }
  }

  /**
   * Get rate plans with availability
   * GET /getRatePlans?startDate={startDate}&endDate={endDate}
   */
  async getRatePlans(params: {
    startDate: string;
    endDate: string;
    propertyIDs?: string;
    roomTypeID?: string;
    promoCode?: string;
    includePromoCode?: boolean;
    adults?: number;
    children?: number;
    detailedRates?: boolean;
  }): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const response = await this.httpClient.get('/getRatePlans', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get rate plans', error);
      throw error;
    }
  }

  /**
   * Update rates (availability and pricing)
   * PATCH /patchRate
   */
  async patchRate(data: {
    rates: Array<{
      rateID: string;
      interval: {
        startDate: string;
        endDate: string;
        rate: number;
        maxLos?: number;
        minLos?: number;
        closedToArrival?: boolean;
        closedToDeparture?: boolean;
      };
    }>;
  }): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const formData = this.buildFormDataForRates(data.rates);
      const response = await this.httpClient.patch('/patchRate', formData);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to patch rate', error);
      throw error;
    }
  }

  /**
   * Create reservation
   * POST /postReservation
   */
  async postReservation(data: {
    propertyID?: string;
    sourceID?: string;
    thirdPartyIdentifier?: string;
    startDate: string;
    endDate: string;
    guestFirstName: string;
    guestLastName: string;
    guestGender?: string;
    guestCountry: string;
    guestZip?: string;
    guestEmail: string;
    guestPhone?: string;
    estimatedArrivalTime?: string;
    rooms: Array<{
      roomTypeID: string;
      quantity: number;
      roomID?: string;
      roomRateID?: string;
    }>;
    adults: Array<{
      roomTypeID: string;
      quantity: number;
      roomID?: string;
    }>;
    children?: Array<{
      roomTypeID: string;
      quantity: number;
      roomID?: string;
    }>;
    paymentMethod?: string;
    cardToken?: string;
    paymentAuthorizationCode?: string;
    customFields?: Array<{
      fieldName: string;
      fieldValue: string;
    }>;
    promoCode?: string;
    allotmentBlockCode?: string;
    dateCreated?: string;
  }): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const formData = this.buildFormDataForReservation(data);
      const response = await this.httpClient.post('/postReservation', formData);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to post reservation', error);
      throw error;
    }
  }

  /**
   * Update reservation (including cancellation)
   * PUT /putReservation
   */
  async putReservation(data: {
    reservationID: string;
    propertyID?: string;
    status?: 'confirmed' | 'not_confirmed' | 'canceled' | 'checked_in' | 'checked_out' | 'no_show';
    checkoutDate?: string;
    estimatedArrivalTime?: string;
    rooms?: Array<{
      subReservationID?: string;
      roomTypeID: string;
      checkinDate: string;
      checkoutDate: string;
      adults: number;
      children: number;
      rateID?: string;
    }>;
    customFields?: Array<{
      customFieldName: string;
      customFieldValue: string;
    }>;
    dateCreated?: string;
  }): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const formData = this.buildFormDataForPutReservation(data);
      const response = await this.httpClient.put('/putReservation', formData);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to put reservation', error);
      throw error;
    }
  }

  /**
   * Get reservation
   * GET /getReservation?reservationID={reservationID}
   */
  async getReservation(reservationID: string, propertyID?: string): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const params: any = { reservationID };
      if (propertyID) params.propertyID = propertyID;
      const response = await this.httpClient.get('/getReservation', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get reservation', error);
      throw error;
    }
  }

  /**
   * Get reservations
   * GET /getReservations
   */
  async getReservations(params?: {
    propertyID?: string;
    status?: string;
    resultsFrom?: string;
    resultsTo?: string;
    modifiedFrom?: string;
    modifiedTo?: string;
    checkInFrom?: string;
    checkInTo?: string;
    checkOutFrom?: string;
    checkOutTo?: string;
    roomID?: string;
    bookingID?: string;
  }): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const response = await this.httpClient.get('/getReservations', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get reservations', error);
      throw error;
    }
  }

  /**
   * Get payment methods
   * GET /getPaymentMethods
   */
  async getPaymentMethods(propertyID?: string): Promise<any> {
    if (!this.isEnabled) {
      throw new Error('CloudBeds integration is disabled');
    }

    try {
      const params = propertyID ? { propertyID } : {};
      const response = await this.httpClient.get('/getPaymentMethods', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get payment methods', error);
      throw error;
    }
  }

  // Helper methods for form data building
  private buildFormDataForRates(rates: Array<{
    rateID: string;
    interval: {
      startDate: string;
      endDate: string;
      rate: number;
      maxLos?: number;
      minLos?: number;
      closedToArrival?: boolean;
      closedToDeparture?: boolean;
    };
  }>): string {
    const formData: any = {};
    
    rates.forEach((rate, index) => {
      formData[`rates[${index}][rateID]`] = rate.rateID;
      formData[`rates[${index}][interval][startDate]`] = rate.interval.startDate;
      formData[`rates[${index}][interval][endDate]`] = rate.interval.endDate;
      formData[`rates[${index}][interval][rate]`] = rate.interval.rate;
      if (rate.interval.maxLos !== undefined) {
        formData[`rates[${index}][interval][maxLos]`] = rate.interval.maxLos;
      }
      if (rate.interval.minLos !== undefined) {
        formData[`rates[${index}][interval][minLos]`] = rate.interval.minLos;
      }
      if (rate.interval.closedToArrival !== undefined) {
        formData[`rates[${index}][interval][closedToArrival]`] = rate.interval.closedToArrival;
      }
      if (rate.interval.closedToDeparture !== undefined) {
        formData[`rates[${index}][interval][closedToDeparture]`] = rate.interval.closedToDeparture;
      }
    });

    return qs.stringify(formData);
  }

  private buildFormDataForReservation(data: any): string {
    const formData: any = {};

    // Simple fields
    if (data.propertyID) formData.propertyID = data.propertyID;
    if (data.sourceID) formData.sourceID = data.sourceID;
    if (data.thirdPartyIdentifier) formData.thirdPartyIdentifier = data.thirdPartyIdentifier;
    formData.startDate = data.startDate;
    formData.endDate = data.endDate;
    formData.guestFirstName = data.guestFirstName;
    formData.guestLastName = data.guestLastName;
    if (data.guestGender) formData.guestGender = data.guestGender;
    formData.guestCountry = data.guestCountry;
    if (data.guestZip) formData.guestZip = data.guestZip;
    formData.guestEmail = data.guestEmail;
    if (data.guestPhone) formData.guestPhone = data.guestPhone;
    if (data.estimatedArrivalTime) formData.estimatedArrivalTime = data.estimatedArrivalTime;
    if (data.paymentMethod) formData.paymentMethod = data.paymentMethod;
    if (data.cardToken) formData.cardToken = data.cardToken;
    if (data.paymentAuthorizationCode) formData.paymentAuthorizationCode = data.paymentAuthorizationCode;
    if (data.promoCode) formData.promoCode = data.promoCode;
    if (data.allotmentBlockCode) formData.allotmentBlockCode = data.allotmentBlockCode;
    if (data.dateCreated) formData.dateCreated = data.dateCreated;

    // Arrays - CloudBeds expects rooms[][roomTypeID] format
    if (data.rooms) {
      data.rooms.forEach((room: any, index: number) => {
        formData[`rooms[${index}][roomTypeID]`] = room.roomTypeID;
        formData[`rooms[${index}][quantity]`] = room.quantity;
        if (room.roomID) formData[`rooms[${index}][roomID]`] = room.roomID;
        if (room.roomRateID) formData[`rooms[${index}][roomRateID]`] = room.roomRateID;
      });
    }

    if (data.adults) {
      data.adults.forEach((adult: any, index: number) => {
        formData[`adults[${index}][roomTypeID]`] = adult.roomTypeID;
        formData[`adults[${index}][quantity]`] = adult.quantity;
        if (adult.roomID) formData[`adults[${index}][roomID]`] = adult.roomID;
      });
    }

    if (data.children) {
      data.children.forEach((child: any, index: number) => {
        formData[`children[${index}][roomTypeID]`] = child.roomTypeID;
        formData[`children[${index}][quantity]`] = child.quantity;
        if (child.roomID) formData[`children[${index}][roomID]`] = child.roomID;
      });
    }

    if (data.customFields) {
      data.customFields.forEach((field: any, index: number) => {
        formData[`customFields[${index}][fieldName]`] = field.fieldName;
        formData[`customFields[${index}][fieldValue]`] = field.fieldValue;
      });
    }

    return qs.stringify(formData);
  }

  private buildFormDataForPutReservation(data: any): string {
    const formData: any = {};

    formData.reservationID = data.reservationID;
    if (data.propertyID) formData.propertyID = data.propertyID;
    if (data.status) formData.status = data.status;
    if (data.checkoutDate) formData.checkoutDate = data.checkoutDate;
    if (data.estimatedArrivalTime) formData.estimatedArrivalTime = data.estimatedArrivalTime;
    if (data.dateCreated) formData.dateCreated = data.dateCreated;

    if (data.rooms) {
      data.rooms.forEach((room: any, index: number) => {
        if (room.subReservationID) formData[`rooms[${index}][subReservationID]`] = room.subReservationID;
        formData[`rooms[${index}][roomTypeID]`] = room.roomTypeID;
        formData[`rooms[${index}][checkinDate]`] = room.checkinDate;
        formData[`rooms[${index}][checkoutDate]`] = room.checkoutDate;
        formData[`rooms[${index}][adults]`] = room.adults;
        formData[`rooms[${index}][children]`] = room.children;
        if (room.rateID) formData[`rooms[${index}][rateID]`] = room.rateID;
      });
    }

    if (data.customFields) {
      data.customFields.forEach((field: any, index: number) => {
        formData[`customFields[${index}][customFieldName]`] = field.customFieldName;
        formData[`customFields[${index}][customFieldValue]`] = field.customFieldValue;
      });
    }

    return qs.stringify(formData);
  }
}

