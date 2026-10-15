// 학자금대출 조건(#80). 값은 전부 레코드(statistics-student-loan-*, 공식 안내 페이지)에서 온다.
import type { DataBundle } from './bundle';
import { get } from './bundle';

export interface StudentLoanTerms { rate: number; tuitionLimit: number; livingLimit: number; livingPerSemester: number }

/** 일반 상환 학자금대출: 연 금리, 박사 등록금대출 총한도, 박사 생활비대출 총한도, 생활비대출 학기당 한도. */
export function studentLoanTerms(data: DataBundle): StudentLoanTerms {
  return {
    rate: get(data, 'statistics-student-loan-rate-2026-h2').value,
    tuitionLimit: get(data, 'statistics-student-loan-tuition-limit-phd-general').value,
    livingLimit: get(data, 'statistics-student-loan-living-limit-phd-general').value,
    livingPerSemester: get(data, 'statistics-student-loan-living-limit-per-semester').value,
  };
}
