import { ServiceRequestCardDto } from './service-request-card.dto';

/**
 * Response for listing service requests with cursor pagination
 */
export class ListServiceRequestsResponseDto {
  /**
   * Items for current page
   */
  items: ServiceRequestCardDto[];

  /**
   * Cursor to fetch next page
   * Null if no more items
   */
  nextCursor: string | null;

  /**
   * Convenience flag: true if more items available
   */
  hasMore: boolean;

  /**
   * Total items in current page
   */
  count: number;

  constructor(
    items: ServiceRequestCardDto[],
    nextCursor: string | null,
    count: number,
  ) {
    this.items = items;
    this.nextCursor = nextCursor;
    this.hasMore = nextCursor !== null;
    this.count = count;
  }
}
