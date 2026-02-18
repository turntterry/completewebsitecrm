export class CreateCustomerDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  notes?: string;
}