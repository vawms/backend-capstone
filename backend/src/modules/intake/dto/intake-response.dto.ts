/**
 * Response after creating intake request
 * Return minimal info to client
 */
export class IntakeResponseDto {
  request_id: string; // service_requests.id
  created_at: Date;
  message: string;

  constructor(request_id: string, created_at: Date) {
    this.request_id = request_id;
    this.created_at = created_at;
    this.message =
      'Service request created successfully. We will get back to you soon.';
  }
}
