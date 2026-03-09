/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { IRequest } from "../types/IRequest";

export default abstract class BaseService {
  private static token: string;

  constructor(_token: string) {
    BaseService.token = _token;
  }
  static async GetData(
    endpointUrl: string,
    _httpReqObj?: Omit<IRequest, "method" | "body">
  ): Promise<any> {
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    };

    return await fetch(endpointUrl, options)
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  static async PostData(
    endpointUrl: string,
    body: any,
    _httpReqObj?: Omit<IRequest, "method" | "body">
  ): Promise<any> {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    };

    return await fetch(endpointUrl, options)
      .then((response) => {
        const result = response.json();
        return result;
      })
      .then((data) => {
        console.log("post response body", data);
        return data;
      })
      .catch((error) => {
        console.error("post error:", error);
      });
  }

  static async PutData(
    endpointUrl: string,
    body: any,
    _httpReqObj?: Omit<IRequest, "method" | "body">
  ): Promise<any> {
    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    };

    return await fetch(endpointUrl, options)
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  static async DeleteData(
    endpointUrl: string,
    _httpReqObj?: Omit<IRequest, "method" | "body">
  ): Promise<any> {
    const options = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      next: { revalidate: 60 },
    };

    return await fetch(endpointUrl, options)
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        console.error(error);
      });
  }
}